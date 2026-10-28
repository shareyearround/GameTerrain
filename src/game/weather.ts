import * as THREE from 'three';

export type WeatherType = 'sunset' | 'midday' | 'rain' | 'twilight';

export interface WeatherPreset {
  name: string;
  label: string;
  sunPosition: THREE.Vector3;
  sunColor: number;
  sunIntensity: number;
  hemisphereSkyColor: number;
  hemisphereGroundColor: number;
  hemisphereIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  skyTopColor: number;
  skyBottomColor: number;
  godRayIntensity: number;
  windSpeed: number;
  rainIntensity: number;
  ambientDescription: string;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  sunset: {
    name: 'sunset',
    label: 'Golden Sunset',
    sunPosition: new THREE.Vector3(-140, 42, -120),
    sunColor: 0xff9944,
    sunIntensity: 3.0,
    hemisphereSkyColor: 0xffb888,
    hemisphereGroundColor: 0x4a3626,
    hemisphereIntensity: 0.95,
    fogColor: 0xd9864a,
    fogNear: 45,
    fogFar: 320,
    skyTopColor: 0x283e60, // Deep serene twilight indigo
    skyBottomColor: 0xffa654, // Luminous golden amber horizon
    godRayIntensity: 1.0,
    windSpeed: 1.4,
    rainIntensity: 0,
    ambientDescription: 'Golden hour god rays pierce the misty canopy.'
  },
  midday: {
    name: 'midday',
    label: 'Clear Midday',
    sunPosition: new THREE.Vector3(20, 160, 40),
    sunColor: 0xfffaed,
    sunIntensity: 2.8,
    hemisphereSkyColor: 0x88ccee,
    hemisphereGroundColor: 0x334422,
    hemisphereIntensity: 1.1,
    fogColor: 0x99ccdd,
    fogNear: 60,
    fogFar: 300,
    skyTopColor: 0x3377cc,
    skyBottomColor: 0xbbe0f5,
    godRayIntensity: 0.35,
    windSpeed: 0.8,
    rainIntensity: 0,
    ambientDescription: 'Bright azure skies and warm sunlight over the valley.'
  },
  rain: {
    name: 'rain',
    label: 'Misty Rainstorm',
    sunPosition: new THREE.Vector3(-60, 70, -60),
    sunColor: 0x778899,
    sunIntensity: 1.2,
    hemisphereSkyColor: 0x556677,
    hemisphereGroundColor: 0x223322,
    hemisphereIntensity: 0.6,
    fogColor: 0x4e5a65,
    fogNear: 15,
    fogFar: 140,
    skyTopColor: 0x273038,
    skyBottomColor: 0x5a6873,
    godRayIntensity: 0.1,
    windSpeed: 3.2,
    rainIntensity: 1.0,
    ambientDescription: 'A heavy mountain mist with soft falling rain and distant thunder.'
  },
  twilight: {
    name: 'twilight',
    label: 'Twilight Aurora',
    sunPosition: new THREE.Vector3(-150, 4, -130),
    sunColor: 0xcc4488,
    sunIntensity: 0.9,
    hemisphereSkyColor: 0x224455,
    hemisphereGroundColor: 0x111622,
    hemisphereIntensity: 0.5,
    fogColor: 0x1a1e36,
    fogNear: 25,
    fogFar: 210,
    skyTopColor: 0x090d1f,
    skyBottomColor: 0x2b1e4a,
    godRayIntensity: 0.45,
    windSpeed: 0.9,
    rainIntensity: 0,
    ambientDescription: 'Dusk falls as glowing fireflies dance across the meadows.'
  }
};

export class WeatherSystem {
  currentType: WeatherType = 'sunset';
  targetType: WeatherType = 'sunset';
  transitionProgress = 1.0;
  windTime = 0;
  lightningTimer = 0;
  lightningFlash = 0;

  // Active interpolated values
  sunPos = new THREE.Vector3().copy(WEATHER_PRESETS.sunset.sunPosition);
  sunColor = new THREE.Color(WEATHER_PRESETS.sunset.sunColor);
  sunIntensity = WEATHER_PRESETS.sunset.sunIntensity;
  hemisphereSkyColor = new THREE.Color(WEATHER_PRESETS.sunset.hemisphereSkyColor);
  hemisphereGroundColor = new THREE.Color(WEATHER_PRESETS.sunset.hemisphereGroundColor);
  hemisphereIntensity = WEATHER_PRESETS.sunset.hemisphereIntensity;
  fogColor = new THREE.Color(WEATHER_PRESETS.sunset.fogColor);
  fogNear = WEATHER_PRESETS.sunset.fogNear;
  fogFar = WEATHER_PRESETS.sunset.fogFar;
  skyTop = new THREE.Color(WEATHER_PRESETS.sunset.skyTopColor);
  skyBottom = new THREE.Color(WEATHER_PRESETS.sunset.skyBottomColor);
  godRayIntensity = WEATHER_PRESETS.sunset.godRayIntensity;
  windSpeed = WEATHER_PRESETS.sunset.windSpeed;
  rainIntensity = WEATHER_PRESETS.sunset.rainIntensity;

  setWeather(type: WeatherType) {
    if (this.currentType === type && this.targetType === type) return;
    this.targetType = type;
    this.transitionProgress = 0.0;
  }

  cycleNext(): WeatherType {
    const list: WeatherType[] = ['sunset', 'midday', 'rain', 'twilight'];
    const nextIdx = (list.indexOf(this.targetType) + 1) % list.length;
    this.setWeather(list[nextIdx]);
    return list[nextIdx];
  }

  update(dt: number) {
    this.windTime += dt * this.windSpeed;

    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + dt * 0.7);
      const from = WEATHER_PRESETS[this.currentType];
      const to = WEATHER_PRESETS[this.targetType];
      const t = this.transitionProgress;

      this.sunPos.lerpVectors(from.sunPosition, to.sunPosition, t);
      this.sunColor.lerpColors(new THREE.Color(from.sunColor), new THREE.Color(to.sunColor), t);
      this.sunIntensity = THREE.MathUtils.lerp(from.sunIntensity, to.sunIntensity, t);
      this.hemisphereSkyColor.lerpColors(new THREE.Color(from.hemisphereSkyColor), new THREE.Color(to.hemisphereSkyColor), t);
      this.hemisphereGroundColor.lerpColors(new THREE.Color(from.hemisphereGroundColor), new THREE.Color(to.hemisphereGroundColor), t);
      this.hemisphereIntensity = THREE.MathUtils.lerp(from.hemisphereIntensity, to.hemisphereIntensity, t);
      this.fogColor.lerpColors(new THREE.Color(from.fogColor), new THREE.Color(to.fogColor), t);
      this.fogNear = THREE.MathUtils.lerp(from.fogNear, to.fogNear, t);
      this.fogFar = THREE.MathUtils.lerp(from.fogFar, to.fogFar, t);
      this.skyTop.lerpColors(new THREE.Color(from.skyTopColor), new THREE.Color(to.skyTopColor), t);
      this.skyBottom.lerpColors(new THREE.Color(from.skyBottomColor), new THREE.Color(to.skyBottomColor), t);
      this.godRayIntensity = THREE.MathUtils.lerp(from.godRayIntensity, to.godRayIntensity, t);
      this.windSpeed = THREE.MathUtils.lerp(from.windSpeed, to.windSpeed, t);
      this.rainIntensity = THREE.MathUtils.lerp(from.rainIntensity, to.rainIntensity, t);

      if (this.transitionProgress >= 1.0) {
        this.currentType = this.targetType;
      }
    }

    // Lightning in rainstorm
    if (this.currentType === 'rain' || this.targetType === 'rain') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 6 + Math.random() * 12;
        this.lightningFlash = 1.0;
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
    }
  }
}
