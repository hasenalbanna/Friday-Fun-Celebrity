import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@friday_fun_rooms_v1';

export async function loadRooms() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRooms(rooms) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}