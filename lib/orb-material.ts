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
  uSecondary: { value: THREE.Color };
  uAtmosphereGlow: { value: number };
  uAtmosphereLevel: { value: number };
  uAtmosphereScale: { value: number };
  uInternalSpeed: { value: number };
  uGlobalDensity: { value: number };
  uChromaticAberration: { value: number };
  uInternalAnimSpeed: { value: number };
  uCornerSmoothness: { value: number };
  uAsymmetry: { value: number };
  uIterations: { value: number };
  uFractalScale: { value: number };
  uEnergyDecay: { value: number };
};

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uSpeed;
  uniform float uFrequency;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

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
    vObjectPosition = position;
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
  uniform float uTime;
  uniform float uEnergy;
  uniform float uFresnel;
  uniform float uAtmosphereGlow;
  uniform float uAtmosphereLevel;
  uniform float uAtmosphereScale;
  uniform float uInternalSpeed;
  uniform float uGlobalDensity;
  uniform float uChromaticAberration;
  uniform float uInternalAnimSpeed;
  uniform float uCornerSmoothness;
  uniform float uAsymmetry;
  uniform float uIterations;
  uniform float uFractalScale;
  uniform float uEnergyDecay;
  uniform vec3 uCore;
  uniform vec3 uRim;
  uniform vec3 uSecondary;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
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

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amp = 0.5;
    float scale = max(0.2, uFractalScale);
    for (int i = 0; i < 7; i++) {
      if (float(i) >= uIterations) break;
      value += abs(noise(p * scale) - 0.5) * amp;
      p = p * (1.72 + uCornerSmoothness * 4.0) + vec3(0.17, 0.31, 0.23);
      amp *= clamp(abs(uEnergyDecay) / 18.0, 0.42, 0.92);
    }
    return value;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vNormal);
    vec3 p = vObjectPosition;
    float t = uTime;
    p.xy = rot(t * uInternalAnimSpeed * 0.18) * p.xy;
    p.xz = rot(t * uInternalSpeed * 0.11) * p.xz;
    p.x += sin(p.y * 3.0 + t * 0.17) * uAsymmetry;

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
    float edge = smoothstep(0.66, 1.04, length(vObjectPosition.xy) * uAtmosphereScale);
    float density = max(0.4, uGlobalDensity);
    float field = fbm(p * density + vec3(t * uInternalSpeed * 0.18, -t * uInternalAnimSpeed * 0.12, t * 0.08));
    float filament = smoothstep(0.18, 0.62, field);
    float fine = smoothstep(0.52, 0.82, fbm(p * (density * 2.15 + 0.3) + vec3(-t * 0.12, t * 0.09, 0.4)));
    float ribbon = smoothstep(0.14, 0.34, abs(sin((p.x * 2.8 + p.y * 1.35 - p.z * 0.9 + field * 4.2) * density)));
    ribbon = 1.0 - ribbon;

    float leftLight = smoothstep(-0.55, 0.72, -vObjectPosition.x + vObjectPosition.y * 0.18 + field * 0.55);
    float shadow = smoothstep(-0.95, 0.35, vObjectPosition.x + vObjectPosition.z * 0.25);
    float inner = clamp((filament * 0.58 + fine * 0.32 + ribbon * 0.82) * leftLight, 0.0, 1.0);
    float secondaryPocket = smoothstep(0.42, 0.9, field + sin(p.y * 5.0 - t * 0.25) * 0.22) * leftLight;

    float coreGlow = smoothstep(0.92, 0.08, length(vObjectPosition.xy)) * (0.28 + uEnergy * 0.52);
    vec3 deep = mix(uCore, vec3(0.0, 0.018, 0.035), 0.45);
    vec3 cyan = uRim * (inner * (1.45 + uEnergy * 1.25));
    vec3 magenta = uSecondary * secondaryPocket * 0.62;
    vec3 atmosphere = uRim * (fresnel * uFresnel * (0.92 + uAtmosphereGlow * 3.1));
    vec3 aberration = mix(uRim, uSecondary, 0.55) * fresnel * uChromaticAberration * 8.0;
    vec3 color = deep + cyan + magenta + atmosphere + aberration + uRim * coreGlow;
    color *= mix(0.34, 1.0, 1.0 - shadow * 0.55);
    color += uRim * edge * uAtmosphereLevel * 0.11;

    float alpha = 0.34 + coreGlow * 0.34 + inner * 0.58 + fresnel * (0.42 + uAtmosphereGlow) + edge * 0.14;
    gl_FragColor = vec4(color, clamp(alpha, 0.28, 0.98));
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
    uCore: overrides?.uCore ?? { value: new THREE.Color("var(--surface)") },
    uRim: overrides?.uRim ?? { value: new THREE.Color("#00B3FF") },
    uSecondary: overrides?.uSecondary ?? { value: new THREE.Color("#FF2ED2") },
    uAtmosphereGlow: overrides?.uAtmosphereGlow ?? { value: 0.15 },
    uAtmosphereLevel: overrides?.uAtmosphereLevel ?? { value: 1 },
    uAtmosphereScale: overrides?.uAtmosphereScale ?? { value: 1.03 },
    uInternalSpeed: overrides?.uInternalSpeed ?? { value: 0.5 },
    uGlobalDensity: overrides?.uGlobalDensity ?? { value: 3 },
    uChromaticAberration: overrides?.uChromaticAberration ?? { value: 0.025 },
    uInternalAnimSpeed: overrides?.uInternalAnimSpeed ?? { value: 0.43 },
    uCornerSmoothness: overrides?.uCornerSmoothness ?? { value: 0.031 },
    uAsymmetry: overrides?.uAsymmetry ?? { value: 0.55 },
    uIterations: overrides?.uIterations ?? { value: 4 },
    uFractalScale: overrides?.uFractalScale ?? { value: 0.97 },
    uEnergyDecay: overrides?.uEnergyDecay ?? { value: -16.7 },
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
