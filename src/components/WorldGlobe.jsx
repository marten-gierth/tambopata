import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SunCalc from 'suncalc';

export default function DayNightGlobe() {
  const mountRef = useRef();
  const materialRef = useRef();
  const globeRef = useRef();

  useEffect(() => {
    const VELOCITY = 1; // minutes per frame

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mountRef.current.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = 500;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 200; // Minimaler Zoomabstand
    controls.maxDistance = 800; // Maximaler Zoomabstand
    controls.zoomSpeed = 0.5; // Verlangsamt das Zoom-Verhalten für smootheres Scrollen
    controls.enableDamping = true; // aktiviert sanftes Nachlaufen
    controls.dampingFactor = 0.05; // Dämpfungsfaktor für sanftes Nachlaufen

    const Globe = new ThreeGlobe();
    const markers = [
      {
        lat: -12.8617,
        lng: -69.4948,
        size: 0.05,
        color: 'white'
      },
      {
        lat: 51.0504,
        lng: 13.7373,
        size: 0.05,
        color: 'white'
      },
      /*{
        lat: 0,
        lng: 0,
        size: 0.3,
        color: 'yellow',
        id: 'sun'
      }*/
    ];
    globeRef.current = Globe;
    scene.add(Globe);

    Globe.pointsData(markers).pointAltitude('size').pointColor('color');

    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

    const dayNightShader = {
      vertexShader: `
        uniform sampler2D heightTexture;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          float height = texture2D(heightTexture, vUv).r;
          vec3 displacedPosition = position + normal * height * 3.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        }
      `
  ,
    fragmentShader: `
        #define PI 3.141592653589793
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec2 sunPosition;
        uniform vec2 globeRotation;
        varying vec3 vNormal;
        varying vec2 vUv;

        float toRad(in float a) {
          return a * PI / 180.0;
        }

        vec3 Polar2Cartesian(in vec2 c) { // [lng, lat]
          float theta = toRad(90.0 - c.x);
          float phi = toRad(90.0 - c.y);
          return vec3(
            sin(phi) * cos(theta),
            cos(phi),
            sin(phi) * sin(theta)
          );
        }

        void main() {
          float invLon = toRad(globeRotation.x);
          float invLat = -toRad(globeRotation.y);
          mat3 rotX = mat3(
            1, 0, 0,
            0, cos(invLat), -sin(invLat),
            0, sin(invLat), cos(invLat)
          );
          mat3 rotY = mat3(
            cos(invLon), 0, sin(invLon),
            0, 1, 0,
            -sin(invLon), 0, cos(invLon)
          );
          vec3 rotatedSunDirection = rotX * rotY * Polar2Cartesian(sunPosition);
          float intensity = dot(normalize(vNormal), normalize(rotatedSunDirection));
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          float blendFactor = smoothstep(-0.1, 0.1, intensity);
          gl_FragColor = mix(nightColor, dayColor, blendFactor);
        }
      `
  };

    Promise.all([
      new THREE.TextureLoader().loadAsync('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg'),
      new THREE.TextureLoader().loadAsync('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg'),
      new THREE.TextureLoader().loadAsync('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'),
    ]).then(([dayTexture, nightTexture, heightTexture]) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          heightTexture: { value: heightTexture },
          sunPosition: { value: new THREE.Vector2() },
          globeRotation: { value: new THREE.Vector2() }
        },
        vertexShader: dayNightShader.vertexShader,
        fragmentShader: dayNightShader.fragmentShader
      });

      materialRef.current = material;
      Globe.globeMaterial(material);

      (function animate() {
        material.uniforms.sunPosition.value.set(...sunPosAt());

        const [lng, lat] = sunPosAt();
        const sunMarker = markers.find(m => m.id === 'sun');
        if (sunMarker) {
          sunMarker.lng = lng;
          sunMarker.lat = lat;
        }
        Globe.pointsData(markers);
        controls.update();

        const camGeo = Globe.toGeoCoords(camera.position);
        material.uniforms.globeRotation.value.set(camGeo.lng, camGeo.lat);

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      })();
    });

    const sunPosAt = () => {
      const now = new Date();
      const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
      let longitude = (hours / 24) * 360 - 180;
      if (longitude < -180) longitude += 360;
      const latitude = 0;
      return [longitude, latitude];
    };

    return () => {
      mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}