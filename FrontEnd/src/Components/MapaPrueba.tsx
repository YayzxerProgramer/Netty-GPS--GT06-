import React from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = {
    width: "100%",
    height: "500px",
};

const center = {
    lat: 4.8087,
    lng: -75.6906,
};

const MapComponent: React.FC = () => {
    return (
        <LoadScript googleMapsApiKey="AIzaSyDzjxJnCUAvGt4pEC-y7vCjyB3c6sCfess">
            <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
                <Marker position={center} />
            </GoogleMap>
        </LoadScript>
    );
};

export default MapComponent;
