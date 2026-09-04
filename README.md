# 🗺️ RE:ROUTE - Travel Itinerary Optimizer

RE:ROUTE is a modern travel planning application designed to help travelers build, optimize, and share their itineraries. It features a powerful route optimization engine that solves the "Traveling Salesperson Problem" (TSP) to minimize travel time between destinations.

![RE:ROUTE Preview](https://via.placeholder.com/1200x600?text=RE:ROUTE+Travel+Itinerary+Optimizer)

## ✨ Features

- **📍 Interactive Trip Builder**: Drag and drop places to build your perfect trip.
- **⚡ Smart Optimization**: Automatically calculates the most efficient route between your destinations using a custom TSP solver.
- **📅 Multi-Day Planning**: Organize your trip across multiple days with hotel stays.
- **🗺️ Real-time Map**: Visualize your route on an interactive map (powered by Leaflet).
- **🤖 AI Descriptions**: Generate beautiful descriptions for your destinations with a single click.
- **💾 Save & Load**: Snapshot your trips and switch between multiple itineraries easily.
- **📄 Pro Export**: Export your finalized itinerary to a print-ready PDF or a text list of places.
- **🌗 Mode Switching**:
  - **Mock Mode**: Explore features with pre-set data (no API keys required).
  - **Real Mode**: Connect to the Google Places API for live location search.

## 🚀 Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dnd-kit.com/)
- **Maps**: [Leaflet](https://leafletjs.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Alicesyn/RE-ROUTE.git
   cd RE-ROUTE
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Environment Variables (Optional)**
   If you want to use "Real Mode" with live Google Places data, create a `.env` file in the root:

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_EKISPERT_API_KEY=your_ekispert_api_key
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📦 Project Structure

- `src/components`: UI components organized by feature (layout, map, schedule, trip-builder).
- `src/store`: Global state management using Zustand.
- `src/services`: Business logic, including the TSP solver and mock data services.
- `src/utils`: Helper functions for distance calculations and formatting.
- `src/types`: TypeScript interfaces and types.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ for travelers everywhere.
