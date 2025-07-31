# Side Project: Tambopata → Dresden

This small project shows a real-time dashboard comparing the timezones and weather for Dresden, Germany, and Tambopata, Peru. The centerpiece is a 3D globe visualization with a dynamic day/night cycle that accurately reflects the current position of the sun.

---

## ✨ Features

* **Dual Time & Weather Display**: Shows current time, weather, and upcoming sun events (sunrise/sunset) for both locations.
* **Countdown Timer**: A "Back Home" countdown to a specific date.
* **Interactive 3D Globe**: An interactive globe visualization with custom pins for each location.
* **Real-time Day/Night Cycle**: The globe's texture dynamically changes to show day and night regions based on the actual time, implemented with custom GLSL shaders.
* **Rotating Clouds**: A semi-transparent cloud layer that rotates independently around the globe.

---

## 🛠️ Built With

This project is built with a combination of modern web technologies, focusing on performance and interactivity.

### Core Architecture

* **[Astro](https://astro.build/)**: The web framework used for building the site. It handles the overall structure and uses its "island architecture" to ship interactive React components only where needed (`client:load`, `client:only`), keeping the rest of the site static and fast.
* **[React](https://react.dev/)**: Used as the UI library for all interactive components, such as the clock and the 3D globe. State management is handled with React Hooks (`useState`, `useEffect`, `useMemo`).

### 3D Visualization & Graphics

* **[Three.js](https://threejs.org/)**: The core WebGL library used to create the 3D scene, camera, renderer, and lighting.
* **[three-globe](https://github.com/vasturiano/three-globe)**: A Three.js-based library used to quickly generate the main Earth geometry and manage map-related data.
* **GLSL (OpenGL Shading Language)**: Custom vertex and fragment shaders were written to create the dynamic day/night lighting effect on the globe's surface.
* **GLTF Loader**: Used within Three.js to load the 3D model for the location pins.

### Data & Time

* **[Luxon](https://moment.github.io/luxon/)**: A powerful JavaScript library for handling all date and time operations. It's used for timezone conversions, date calculations for the countdown, and determining the sun's position.
* **[Open-Meteo API](https://open-meteo.com/)**: A free and open-source weather API used to fetch current weather conditions, precipitation probability, and sun event times for both locations.

### Styling

* **Scoped CSS**: Styling is handled with standard CSS written directly within Astro components. This leverages Astro's ability to scope styles to the component, preventing global conflicts.
