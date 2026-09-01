import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRouteStore } from "../../store/useRouteStore";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// A component to auto-fit map bounds
const MapBounds: React.FC<{ places: any[]; hotels: any[] }> = ({
  places,
  hotels,
}) => {
  const map = useMap();

  useEffect(() => {
    // Leaflet often renders tiles gray if container size changes. This fixes it.
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const points: [number, number][] = [
      ...places.map((p) => [p.lat, p.lng] as [number, number]),
      ...hotels.map((h) => [h.lat, h.lng] as [number, number]),
    ];

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [places, hotels, map]);

  return null;
};

// Colors for different days
const ROUTE_COLORS = ["#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];

export const MapView: React.FC = () => {
  const { places, hotels, optimizedRoutes } = useRouteStore();

  // If no places, show NYC by default
  const defaultCenter: [number, number] =
    places.length > 0 ? [places[0].lat, places[0].lng] : [40.758, -73.9855];

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, METI, TomTom'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />

        <MapBounds places={places} hotels={hotels} />

        {/* Draw Markers for Unoptimized Places */}
        {optimizedRoutes.length === 0 &&
          places.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-sm">{place.name}</h3>
                  <p className="text-xs text-gray-500">{place.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Draw Optimized Routes */}
        {optimizedRoutes.map((route, i) => {
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
          const positions: [number, number][] = [];

          if (route.startHotel)
            positions.push([route.startHotel.lat, route.startHotel.lng]);
          route.stops.forEach((s) => positions.push([s.lat, s.lng]));
          if (route.endHotel)
            positions.push([route.endHotel.lat, route.endHotel.lng]);

          return (
            <React.Fragment key={i}>
              <Polyline
                positions={positions}
                pathOptions={{ color, weight: 4, opacity: 0.8 }}
              />

              {/* Start Hotel Marker */}
              {route.startHotel && (
                <Marker
                  key={`start-hotel-${i}`}
                  position={[route.startHotel.lat, route.startHotel.lng]}
                >
                  <Popup>
                    <h3 className="font-bold text-sm">
                      Day {route.day + 1} Start: {route.startHotel.name}
                    </h3>
                  </Popup>
                </Marker>
              )}

              {/* End Hotel Marker (if different) */}
              {route.endHotel &&
                (!route.startHotel ||
                  route.startHotel.name !== route.endHotel.name) && (
                  <Marker
                    key={`end-hotel-${i}`}
                    position={[route.endHotel.lat, route.endHotel.lng]}
                  >
                    <Popup>
                      <h3 className="font-bold text-sm">
                        Day {route.day + 1} End: {route.endHotel.name}
                      </h3>
                    </Popup>
                  </Marker>
                )}

              {/* Stop Markers */}
              {route.stops.map((stop, stopIdx) => {
                const icon = L.divIcon({
                  className: "custom-div-icon",
                  html: `<div style="background-color: ${color}; color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${stopIdx + 1}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                });

                return (
                  <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <h3 className="font-bold text-sm">
                        Day {i + 1} - Stop {stopIdx + 1}
                      </h3>
                      <p className="font-semibold text-gray-800">{stop.name}</p>
                    </Popup>
                  </Marker>
                );
              })}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
