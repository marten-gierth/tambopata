# Side Project: Tambopata → Dresden

This project is a real-time dashboard comparing the timezones and weather for Dresden, Germany, and Tambopata, Peru. The centerpiece is an interactive 3D globe with a dynamic day/night cycle that accurately reflects the current position of the sun and clouds.

---

## ✨ Features

* **Side-by-Side Display**: Shows the current time, weather, and sunrise/sunset for both locations.
* **Live 3D Globe**: An interactive globe with:
  * **Real-time Day/Night**: A custom shader lights up the parts of the Earth facing the sun in real-time.
  * **Cloud Layer with 3D Effect**: A layer of clouds from recent satellite images floats over the globe.

---

## 🛠️ Tech Stack

* **Framework**: **[Astro](https://astro.build/)** and **[React](https://react.dev/)** were used to build the page.
* **3D Graphics**: Made with **[Three.js](https://threejs.org/)**, using **[`three-globe`](https://github.com/vasturiano/three-globe)** for the Earth shape and **[`GLTFLoader`](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)** for the location pins.
* **Custom Shaders**: **[GLSL](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)** code was written for the day/night lighting effect.
* **Data Sources**:
  * **[Open-Meteo API](https://open-meteo.com/)**: Gets the live weather and sun times. **[Check Status](https://tambopata-dresden.openstatus.dev)**
  * **[EUMETSAT](https://www.eumetsat.int/)**: Provides the cloud images, through the **[Live Cloud Maps](https://github.com/matteason/live-cloud-maps)** project.
* **Time**: **[Luxon](https://moment.github.io/luxon/)** is used for handling all timezones and dates.