import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from './src/theme';
import { loadRooms, saveRooms } from './src/storage';

function makeRoomKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let index = 0; index < 6; index += 1) {
    key += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return key;
}

function makeRoomName(key) {
  return `Room ${key}`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function App() {
  const [rooms, setRooms] = useState([]);
  const [roomKeyInput, setRoomKeyInput] = useState('');
  const [activeRoomKey, setActiveRoomKey] = useState('');
  const [caption, setCaption] = useState('');
  const [statusMessage, setStatusMessage] = useState('Create a room or join one with a key.');

  useEffect(() => {
    let mounted = true;

    loadRooms().then((savedRooms) => {
      if (mounted) {
        setRooms(savedRooms);
        if (savedRooms.length > 0) {
          setActiveRoomKey(savedRooms[0].key);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    saveRooms(rooms).catch(() => {
      setStatusMessage('Could not save rooms locally.');
    });
  }, [rooms]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.key === activeRoomKey) || null,
    [rooms, activeRoomKey]
  );

  async function createRoom() {
    const key = makeRoomKey();
    const newRoom = {
      key,
      name: makeRoomName(key),
      createdAt: Date.now(),
      coverUri: '',
      images: [],
    };

    setRooms((currentRooms) => [newRoom, ...currentRooms]);
    setActiveRoomKey(key);
    setRoomKeyInput('');
    setStatusMessage(`Room ${key} created.`);
  }

  function joinRoom() {
    const normalizedKey = roomKeyInput.trim().toUpperCase();

    if (!normalizedKey) {
      setStatusMessage('Enter a room key first.');
      return;
    }

    const roomExists = rooms.some((room) => room.key === normalizedKey);
    if (!roomExists) {
      setStatusMessage(`Room ${normalizedKey} not found. Create it first or check the key.`);
      return;
    }

    setActiveRoomKey(normalizedKey);
    setRoomKeyInput('');
    setStatusMessage(`Joined room ${normalizedKey}.`);
  }

  async function addImage() {
    if (!activeRoom) {
      setStatusMessage('Join a room before adding images.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to add room images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const newImage = {
      id: `${Date.now()}`,
      uri: asset.uri,
      caption: caption.trim() || 'Untitled image',
      createdAt: Date.now(),
    };

    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.key !== activeRoom.key) {
          return room;
        }

        const images = [newImage, ...room.images];

        return {
          ...room,
          coverUri: room.coverUri || asset.uri,
          images,
        };
      })
    );

    setCaption('');
    setStatusMessage('Image added to the room.');
  }

  const roomCards = useMemo(() => rooms.slice(0, 6), [rooms]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>Room-based image voting</Text>
            <Text style={styles.title}>Friday Fun Celebrity</Text>
            <Text style={styles.subtitle}>
              Create a room key, join a room, and add images that your group can manage together.
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Room Key</Text>
            <Text style={styles.sectionBody}>{statusMessage}</Text>

            <View style={styles.row}>
              <TextInput
                value={roomKeyInput}
                onChangeText={setRoomKeyInput}
                autoCapitalize="characters"
                placeholder="ENTER KEY"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.rowGrow]}
              />
              <Pressable style={styles.secondaryButton} onPress={joinRoom}>
                <Text style={styles.secondaryButtonText}>Join</Text>
              </Pressable>
            </View>

            <Pressable style={styles.primaryButton} onPress={createRoom}>
              <Text style={styles.primaryButtonText}>Create New Room</Text>
            </Pressable>
          </View>

          {activeRoom ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{activeRoom.name}</Text>
                  <Text style={styles.sectionBody}>Key: {activeRoom.key}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeRoom.images.length} images</Text>
                </View>
              </View>

              <View style={styles.row}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Image caption"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.rowGrow]}
                />
                <Pressable style={styles.secondaryButton} onPress={addImage}>
                  <Text style={styles.secondaryButtonText}>Add</Text>
                </Pressable>
              </View>

              {activeRoom.images.length > 0 ? (
                <FlatList
                  data={activeRoom.images}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  renderItem={({ item }) => (
                    <View style={styles.imageCard}>
                      <Image source={{ uri: item.uri }} style={styles.image} />
                      <Text style={styles.imageCaption} numberOfLines={1}>
                        {item.caption}
                      </Text>
                      <Text style={styles.imageMeta}>{formatDate(item.createdAt)}</Text>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No images yet</Text>
                  <Text style={styles.emptyStateText}>
                    Add the first image to make this room come alive.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Rooms Section</Text>
            <Text style={styles.sectionBody}>Recent rooms saved on this device.</Text>

            {roomCards.length > 0 ? (
              roomCards.map((room) => (
                <Pressable
                  key={room.key}
                  style={[
                    styles.roomCard,
                    activeRoomKey === room.key && styles.roomCardActive,
                  ]}
                  onPress={() => setActiveRoomKey(room.key)}
                >
                  {room.coverUri ? <Image source={{ uri: room.coverUri }} style={styles.roomThumb} /> : <View style={styles.roomThumbPlaceholder} />}
                  <View style={styles.roomCardBody}>
                    <Text style={styles.roomCardTitle}>{room.name}</Text>
                    <Text style={styles.roomCardText}>Key: {room.key}</Text>
                    <Text style={styles.roomCardText}>{room.images.length} images</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No rooms yet</Text>
                <Text style={styles.emptyStateText}>
                  Create your first room key to start collecting images.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  kicker: {
    color: colors.accentSoft,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowGrow: {
    flex: 1,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panelSoft,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#1a120e',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(103, 212, 157, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  gridRow: {
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  imageCard: {
    width: '48%',
    backgroundColor: colors.panelSoft,
    borderRadius: 18,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: 14,
    backgroundColor: '#23344f',
  },
  imageCaption: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.sm,
    fontSize: 13,
  },
  imageMeta: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 11,
  },
  emptyState: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateText: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  roomCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: 18,
    padding: spacing.sm,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  roomCardActive: {
    borderColor: colors.accent,
  },
  roomThumb: {
    width: 74,
    height: 74,
    borderRadius: 16,
    backgroundColor: '#23344f',
  },
  roomThumbPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 16,
    backgroundColor: '#23344f',
  },
  roomCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  roomCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  roomCardText: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
  },
});

export default App;