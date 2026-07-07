export type AttendanceLocation = {
  latitude: number;
  longitude: number;
};

export function requestAttendanceLocation(): Promise<AttendanceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Location is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error("Location permission is required to mark attendance.")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
