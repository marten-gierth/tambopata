// Imports
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Component Declaration
export default function DayNightGlobe() {
  const mountRef = useRef();
  const materialRef = useRef();
  const globeRef = useRef();

  // useEffect Hook
  useEffect(() => {
    // Initial Constants and Three.js Setup
    const VELOCITY = 1; // minutes per frame (not directly used in current sun position logic, but kept for context)

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); // Set pixel ratio for high-DPI screens
    mountRef.current.appendChild(renderer.domElement);

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Added FOV, near, and far planes
    camera.position.z = 500;
    camera.updateProjectionMatrix();

    // OrbitControls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 200; // Minimum zoom distance
    controls.maxDistance = 800; // Maximum zoom distance
    controls.zoomSpeed = 0.5; // Slows down zooming for smoother scroll behavior
    controls.enableDamping = true; // Enables smooth damping
    controls.dampingFactor = 0.05; // Damping factor for smooth movement

    // Globe Initialization
    const Globe = new ThreeGlobe();

    // Markers Data
    // Added the sun marker back in and made its color yellow
    const markers = [
      {
        lat: -12.8617,
        lng: -69.4948,
        size: 0.1,
        color: 'white'
      },
      {
        lat: 51.0504,
        lng: 13.7373,
        size: 0.1,
        color: 'white'
      },
      {
        lat: 0, // Initial latitude for the sun marker
        lng: 0, // Initial longitude for the sun marker
        size: 0.3, // Size of the sun marker
        color: 'yellow', // Color of the sun marker
        id: 'sun' // Unique ID for the sun marker
      }
    ];
    globeRef.current = Globe;
    scene.add(Globe);

    // Set globe data for points
    Globe.pointsData(markers).pointAltitude('size').pointColor('color');

    // Adding Lights
    // Ambient light provides general illumination
    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    // Directional light simulates sunlight
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

    // Shader Definition for Day/Night effect
    const dayNightShader = {
      vertexShader: `
        uniform sampler2D heightTexture; // Texture for height displacement
        varying vec3 vNormal; // Normal vector passed to fragment shader
        varying vec2 vUv; // UV coordinates passed to fragment shader
        void main() {
          vNormal = normalize(normalMatrix * normal); // Transform normal to view space
          vUv = uv; // Pass UV coordinates
          float height = texture2D(heightTexture, vUv).r; // Get height from texture
          vec3 displacedPosition = position + normal * height * 3.0; // Displace vertex
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0); // Project vertex
        }
      `,
      fragmentShader: `
        #define PI 3.141592653589793 // Define PI constant
        uniform sampler2D dayTexture; // Day texture
        uniform sampler2D nightTexture; // Night texture
        uniform vec2 sunPosition; // Sun's longitude and latitude
        uniform vec2 globeRotation; // Globe's current rotation (from camera perspective)
        varying vec3 vNormal; // Interpolated normal from vertex shader
        varying vec2 vUv; // Interpolated UV from vertex shader

        // Convert degrees to radians
        float toRad(in float a) {
          return a * PI / 180.0;
        }

        // Convert polar coordinates (longitude, latitude) to Cartesian (x, y, z)
        vec3 Polar2Cartesian(in vec2 c) { // c = [lng, lat]
          float theta = toRad(90.0 - c.x); // Convert longitude to theta angle
          float phi = toRad(90.0 - c.y); // Convert latitude to phi angle
          return vec3(
            sin(phi) * cos(theta), // X coordinate
            cos(phi),             // Y coordinate
            sin(phi) * sin(theta) // Z coordinate
          );
        }

        void main() {
          // Invert longitude and latitude for correct rotation
          float invLon = toRad(globeRotation.x);
          float invLat = -toRad(globeRotation.y);

          // Rotation matrices for X and Y axes
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

          // Rotate sun direction based on globe's current orientation
          vec3 rotatedSunDirection = rotX * rotY * Polar2Cartesian(sunPosition);

          // Calculate light intensity based on dot product of normal and sun direction
          float intensity = dot(normalize(vNormal), normalize(rotatedSunDirection));

          // Sample day and night textures
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);

          // Smoothly blend between day and night based on intensity
          float blendFactor = smoothstep(-0.1, 0.1, intensity);
          gl_FragColor = mix(nightColor, dayColor, blendFactor);
        }
      `
    };

    // Loading Textures and Material Setup
    // Use Promise.all to load all textures concurrently
    Promise.all([
      new THREE.TextureLoader().loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg'),
      new THREE.TextureLoader().loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg'),
      new THREE.TextureLoader().loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png'),
    ]).then(([dayTexture, nightTexture, heightTexture]) => {
      // Create the ShaderMaterial with loaded textures and uniforms
      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          heightTexture: { value: heightTexture },
          sunPosition: { value: new THREE.Vector2() }, // Initialize sun position uniform
          globeRotation: { value: new THREE.Vector2() } // Initialize globe rotation uniform
        },
        vertexShader: dayNightShader.vertexShader,
        fragmentShader: dayNightShader.fragmentShader
      });

      materialRef.current = material; // Store material reference
      Globe.globeMaterial(material); // Apply the custom material to the globe

      // Animation Loop Function
      (function animate() {
        // Update sun position in the shader uniforms
        const [lng, lat] = sunPosAt();
        material.uniforms.sunPosition.value.set(lng, lat);

        // Update the sun marker's position on the globe
        const sunMarker = markers.find(m => m.id === 'sun');
        if (sunMarker) {
          sunMarker.lng = lng;
          sunMarker.lat = lat;
        }
        Globe.pointsData(markers); // Re-set points data to update marker positions

        controls.update(); // Update OrbitControls for smooth camera movement

        // Get camera's geographical coordinates and pass to shader for correct day/night orientation
        const camGeo = Globe.toGeoCoords(camera.position);
        material.uniforms.globeRotation.value.set(camGeo.lng, camGeo.lat);

        renderer.render(scene, camera); // Render the scene
        requestAnimationFrame(animate); // Request next animation frame
      })();
    }).catch(error => {
      console.error("Failed to load textures:", error); // Basic error handling for texture loading
    });

    // Sun Position Calculation Function
    // Calculates the approximate longitude and latitude of the sun based on current UTC time
    const sunPosAt = () => {
      const now = new Date();
      const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
      let longitude = (hours / 24) * 360 - 180; // Convert UTC hours to longitude
      if (longitude < -180) longitude += 360; // Ensure longitude is within -180 to 180 range
      const latitude = 0; // Sun is assumed to be at the equator for simplicity
      return [longitude, latitude];
    };

    // Handle window resize events for responsiveness
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup Function
    // This runs when the component unmounts to free up resources
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
      window.removeEventListener('resize', handleResize); // Remove resize listener
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Return Statement
  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
