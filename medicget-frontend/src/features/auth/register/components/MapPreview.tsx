import { MapContainer, TileLayer, Marker } from "react-leaflet";

export const MapPreview = ({ lat, lng }: any) => {
  const center = lat && lng ? [lat, lng] : [-0.18, -78.46];

  return (
    <MapContainer center={center} zoom={13} style={{ height: 150 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
};