const Geolocation = {
  requestAuthorization: (success: () => void) => success(),
  getCurrentPosition: (success: (position: {coords: {latitude: number; longitude: number}}) => void) =>
    success({coords: {latitude: 37.4563, longitude: 126.8956}}),
};

export default Geolocation;