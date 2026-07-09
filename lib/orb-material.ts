import * as THREE from "three";

export type OrbUniforms = {
  uTime: { value: number };
  uAmplitude: { value: number };
  uFrequency: { value: number };
  uSpeed: { value: number };
  uFresnel: { value: number };
  uEnergy: { value: number };
  uCore: { value: THREE.Color };
  uRim: { value: THREE.Color };
};

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uSpeed;
  uniform float uFrequency;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    float slow = noise(pos * uFrequency + vec3(uTime * uSpeed * 0.32));
    float fine = noise(pos * (uFrequency * 3.1) + vec3(-uTime * uSpeed * 0.78));
    float displacement = ((slow - 0.5) * 0.78 + (fine - 0.5) * 0.22) * uAmplitude;
    pos += normal * displacement;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float uEnergy;
  uniform float uFresnel;
  uniform vec3 uCore;
  uniform vec3 uRim;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
    float centerGlow = 1.0 - smoothstep(0.0, 1.35, length(vWorldPosition.xy));
    vec3 base = mix(uCore, uRim, centerGlow * (0.25 + uEnergy * 0.22));
    vec3 rim = uRim * fresnel * uFresnel;
    float alpha = 0.36 + fresnel * 0.42 + centerGlow * 0.16;
    gl_FragColor = vec4(base + rim, alpha);
  }
`;

export function createOrbUniforms(overrides?: Partial<OrbUniforms>): OrbUniforms {
  return {
    uTime: overrides?.uTime ?? { value: 0 },
    uAmplitude: overrides?.uAmplitude ?? { value: 0.12 },
    uFrequency: overrides?.uFrequency ?? { value: 1.9 },
    uSpeed: overrides?.uSpeed ?? { value: 0.15 },
    uFresnel: overrides?.uFresnel ?? { value: 0.6 },
    uEnergy: overrides?.uEnergy ?? { value: 0.35 },
    uCore: overrides?.uCore ?? { value: new THREE.Color("#0B0D0F") },
    uRim: overrides?.uRim ?? { value: new THREE.Color("#C8A96A") },
  };
}

export function createOrbMaterial(uniforms: OrbUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
