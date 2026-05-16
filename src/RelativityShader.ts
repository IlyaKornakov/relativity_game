import * as THREE from 'three';

export const RelativityShader = {
  uniforms: {
    uVelocity: { value: new THREE.Vector3(0, 0, 0) },
    uSpeedOfLight: { value: 30.0 }
  },

  inject: function (shader: any) {
    shader.uniforms.uVelocity = this.uniforms.uVelocity;
    shader.uniforms.uSpeedOfLight = this.uniforms.uSpeedOfLight;

    shader.vertexShader = `
      uniform vec3 uVelocity;
      uniform float uSpeedOfLight;
      varying float vDoppler;
      #ifdef USE_INSTANCING
        attribute vec3 instanceVelocity;
      #endif
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 worldPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        worldPosition = instanceMatrix * worldPosition;
        vec3 v_car = instanceVelocity;
      #else
        vec3 v_car = vec3(0.0);
      #endif
      worldPosition = modelMatrix * worldPosition;

      // r0 is the current instantaneous position vector from camera
      vec3 r0 = worldPosition.xyz - cameraPosition;
      
      float c = uSpeedOfLight;
      float v_car2 = dot(v_car, v_car);
      
      // r will be the true retarded position of emission
      vec3 r = r0;
      if (v_car2 > 1e-6) {
          // Solve light cone equation: (c^2 - v^2)t^2 - 2(r0 . v)t - |r0|^2 = 0
          float A = c * c - v_car2;
          float B = -2.0 * dot(r0, v_car);
          float C = -dot(r0, r0);
          
          float desc = B * B - 4.0 * A * C;
          if (desc >= 0.0 && A > 1e-6) {
              float t_emit = (-B - sqrt(desc)) / (2.0 * A);
              r = r0 + v_car * t_emit;
          }
      }

      float r_len = length(r);
      
      vec3 beta = uVelocity / uSpeedOfLight;
      float b2 = dot(beta, beta);
      b2 = min(b2, 0.999999); 
      
      float gamma = 1.0 / sqrt(1.0 - b2);
      
      // Apply Lorentz Aberration to the retarded position
      vec3 r_prime = r;
      if (b2 > 1e-6) {
        float gamma_minus_1_over_b2 = (gamma - 1.0) / b2;
        r_prime = r + gamma_minus_1_over_b2 * dot(beta, r) * beta + gamma * r_len * beta;
      }

      vec4 mvPosition = viewMatrix * vec4(cameraPosition + r_prime, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Doppler Calculation
      vec3 r_prime_dir = length(r_prime) > 1e-6 ? normalize(r_prime) : vec3(0.0);
      vDoppler = 1.0 / (gamma * (1.0 - dot(beta, r_prime_dir) + 1e-6));
      
      // Combine with source Doppler shift if it is moving
      if (v_car2 > 1e-6) {
          vec3 beta_src = v_car / c;
          float gamma_src = 1.0 / sqrt(1.0 - dot(beta_src, beta_src));
          vec3 n_emit = normalize(-r);
          float doppler_src = 1.0 / (gamma_src * (1.0 - dot(beta_src, n_emit)));
          vDoppler *= doppler_src;
      }
      `
    );

    shader.fragmentShader = `
      varying float vDoppler;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `
      float beaming = pow(vDoppler, 1.5);
      
      float bShift = clamp(log(vDoppler) * 1.5, -1.0, 1.0);
      vec3 tint = vec3(1.0);
      if (bShift > 0.0) {
        // Blueshift
        tint.r = 1.0 - bShift;
        tint.g = 1.0 - bShift * 0.5;
      } else {
        // Redshift
        tint.b = 1.0 + bShift;
        tint.g = 1.0 + bShift * 0.5;
      }

      gl_FragColor.rgb = gl_FragColor.rgb * tint * beaming;

      #include <tonemapping_fragment>
      `
    );
  }
};
