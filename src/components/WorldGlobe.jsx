// Imports
import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DateTime} from 'luxon';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

// Component Declaration
export default function DayNightGlobe() {
    const mountRef = useRef();
    const materialRef = useRef();
    const globeRef = useRef();
    const [utcTime, setUtcTime] = useState(''); // State to store and display UTC time

    // useEffect Hook
    useEffect(() => {
        // Initial Constants and Three.js Setup

        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({antialias: true}); // Enable antialiasing for smoother edges

        // Conditionally set renderer size and pixel ratio only if window is defined
        if (typeof window !== 'undefined') {
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        }
        mountRef.current.appendChild(renderer.domElement);

        // Camera Setup
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000); // Initialize aspect ratio to 1, will be updated in handleResize
        camera.position.z = 400; // Adjusted camera Z position further back for a better initial fit

        // Conditionally update camera aspect ratio only if window is defined
        if (typeof window !== 'undefined') {
            camera.aspect = window.innerWidth / window.innerHeight;
        }
        camera.updateProjectionMatrix();

        // OrbitControls Setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.minDistance = 200; // Minimum zoom distance (still relevant for initial position)
        controls.maxDistance = 500; // Maximum zoom distance (still relevant for initial position)
        controls.zoomSpeed = 0.5; // Slows down zooming for smoother scroll behavior
        controls.enableDamping = true; // Enables smooth damping
        controls.dampingFactor = 0.05; // Damping factor for smooth movement
        controls.enableZoom = true; // Deactivate the ability to zoom the map
        controls.enablePan = false; // Deactivate the ability to pan/move the globe

        // Globe Initialization
        const Globe = new ThreeGlobe();

        // Markers Data
        const markers = [
            {
                lat: -12.8617,
                lng: -69.4948,
                size: 0,
                /*color: 'white',*/
            },
            {
                lat: 51.0504,
                lng: 13.7373,
                size: 0,
                /*color: 'white',*/
            },
            /* {
               lat: 0,
               lng: 0,
               size: 0.3,
               color: 'yellow',
               id: 'sun'
             }*/
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
        varying vec3 vNormal; // Normal in view space
        varying vec2 vUv;

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

        const cloudsShader = {
            vertexShader: `
                uniform sampler2D cloudsTexture;
                uniform float cloudHeightScale;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    // Get the raw alpha value from the texture
                    float rawAlpha = texture2D(cloudsTexture, vUv).a;

                    // Use smoothstep to create a gentler curve for the height transition
                    float height = smoothstep(0.01, 1.0, rawAlpha);

                    // Displace vertices based on the smoothed height
                    vec3 displacedPosition = position + normal * height * cloudHeightScale;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D cloudsTexture;
                uniform float uOpacity; // Uniform for overall opacity
                varying vec2 vUv;
                void main() {
                    vec4 cloudColor = texture2D(cloudsTexture, vUv);
                    
                    // Discard fragments that are almost fully transparent
                    if (cloudColor.a < 0.05) discard;

                    // Apply the overall opacity
                    gl_FragColor = vec4(cloudColor.rgb, cloudColor.a * uOpacity);
                }
            `
        };


        // Loading Textures and Material Setup
        Promise.all([
            new THREE.TextureLoader().loadAsync('assets/worldGlobe/earth-blue-marble.jpg'),
            new THREE.TextureLoader().loadAsync('assets/worldGlobe/earth-night.jpg'),
            new THREE.TextureLoader().loadAsync('assets/worldGlobe/earth-topology.png'),
            new THREE.TextureLoader().loadAsync('https://clouds.matteason.co.uk/images/2048x1024/clouds-alpha.png')
        ]).then(([dayTexture, nightTexture, heightTexture, cloudsTexture]) => {
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    dayTexture: {value: dayTexture},
                    nightTexture: {value: nightTexture},
                    heightTexture: {value: heightTexture},
                    sunPosition: {value: new THREE.Vector2()},
                    globeRotation: {value: new THREE.Vector2()}
                },
                vertexShader: dayNightShader.vertexShader,
                fragmentShader: dayNightShader.fragmentShader
            });

            materialRef.current = material; // Store material reference
            Globe.globeMaterial(material); // Apply the custom material to the globe

            const CLOUDS_ALT = 0.03;           // Lifts clouds to prevent clipping into mountains
            const CLOUD_HEIGHT_SCALE = 0.8;    // Controls cloud "puffiness"
            const CLOUDS_OPACITY = 0.5;        // Controls overall cloud transparency
            const CLOUDS_ROTATION_SPEED = 0;

            // Create Clouds Mesh
            const Clouds = new THREE.Mesh(
                new THREE.SphereGeometry(Globe.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75)
            );

            // This rotates the clouds -90 degrees around the Y-axis to match the globe.
            Clouds.rotation.y = -Math.PI / 2;

            // Apply the final shader material to the clouds
            Clouds.material = new THREE.ShaderMaterial({
                uniforms: {
                    cloudsTexture: {value: cloudsTexture},
                    cloudHeightScale: {value: CLOUD_HEIGHT_SCALE},
                    uOpacity: {value: CLOUDS_OPACITY} // Pass opacity to the shader
                },
                vertexShader: cloudsShader.vertexShader,
                fragmentShader: cloudsShader.fragmentShader,
                transparent: true,
                depthWrite: false,
            });

            Globe.add(Clouds);

            function loadPins(scaleFactor = 1) {
                const loader = new GLTFLoader();
                markers.forEach(marker => {
                    loader.load('assets/worldGlobe/pin.glb', gltf => {
                        const pin = gltf.scene;

                        // Get the coordinates object from the three-globe library
                        const positionObj = globeRef.current.getCoords(marker.lat, marker.lng, 0);

                        // Set the position of the pin.
                        pin.position.set(positionObj.x, positionObj.y, positionObj.z);

                        // Use pin.position for alignment.
                        // Since pin.position is a THREE.Vector3, it has the .clone() method.
                        const up = pin.position.clone().normalize();
                        const target = new THREE.Vector3(0, 1, 0);
                        const quaternion = new THREE.Quaternion().setFromUnitVectors(target, up);
                        pin.quaternion.copy(quaternion);

                        pin.scale.set(2 * scaleFactor, 2 * scaleFactor, 2 * scaleFactor);

                        // Important: Add the pin to the Globe instance, not the scene.
                        // This way, it rotates with the globe.
                        globeRef.current.add(pin);
                    });
                });
            }

            let lastRenderedMinute = -1;

            // Start animation loop first
            function animate() {
                const now = DateTime.utc();
                const currentMinute = now.minute;

                // Only update sun position and marker if the minute has changed
                if (currentMinute !== lastRenderedMinute) {
                    const [lng, lat, currentTime] = sunPosAt(now); // Get sun position based on current real UTC time
                    material.uniforms.sunPosition.value.set(lng, lat);

                    const sunMarker = markers.find(m => m.id === 'sun');
                    if (sunMarker) {
                        sunMarker.lng = lng;
                        sunMarker.lat = lat;
                    }
                    Globe.pointsData(markers); // Update marker data
                    setUtcTime(currentTime); // Update displayed UTC time

                    lastRenderedMinute = currentMinute; // Store the current minute
                }

                controls.update(); // Always update controls for smooth rotation
                const camGeo = Globe.toGeoCoords(camera.position);
                material.uniforms.globeRotation.value.set(camGeo.lng, camGeo.lat);

                // Clouds always rotate smoothly
                Clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;

                renderer.render(scene, camera); // Always render
                requestAnimationFrame(animate);
            }

            // Start animation
            animate();
            // Load pins after animation has started
            loadPins(1.5);
        }).catch(error => {
            console.error("Failed to load textures:", error);
        });

        const sunPosAt = (time) => {
            const LONGITUDE_OFFSET_HOURS = 0;

            // Apply the custom offset to the UTC time for calculation
            // Negate the hours to reverse the direction of sun's movement
            const adjustedTime = time.plus({hours: LONGITUDE_OFFSET_HOURS});
            const hours = adjustedTime.hour + adjustedTime.minute / 60; // Get hours and minutes from the adjusted DateTime object

            // Invert the hours for longitude calculation to reverse the direction of movement
            let longitude = ((-hours) / 24) * 360 - 180;

            if (longitude < -180) longitude += 360; // Ensure longitude is within -180 to 180 range
            if (longitude > 180) longitude -= 360; // Ensure longitude is within -180 to 180 range (handle wrap-around for positive values)


            // Calculate day of the year for solar declination
            const dayOfYear = adjustedTime.ordinal; // Luxon's ordinal property gives the day of the year (1-366)

            // Solar declination formula (approximate)
            // delta = 23.45 * sin(360/365 * (N - 81))
            // N is the day of the year (1 for Jan 1st)
            const latitude = 23.45 * Math.sin(THREE.MathUtils.degToRad(360 / 365 * (dayOfYear - 81)));

            console.log(`Sun @ ${time.toFormat('yyyy-MM-dd HH:mm:ss')} UTC | Day ${dayOfYear} | Lon ${longitude.toFixed(2)} | Lat ${latitude.toFixed(2)}`);

            return [longitude, latitude, time.toFormat('HH:mm:ss UTC')];
        };

        const handleResize = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const height = window.innerHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            controls.dispose();
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    return (
        <div ref={mountRef} style={{width: '100vw', height: '100vh', overflow: 'hidden'}}></div>
    );
}