import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { log } from '../lib/logger';

interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
}

interface ImageResult {
  uri: string;
  width: number;
  height: number;
  type: string;
  size?: number;
  base64?: string;
}

export function useImagePicker() {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images!'
        );
        return false;
      }
    }
    return true;
  };

  const requestCameraPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos!'
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromLibrary = async (options: ImagePickerOptions = {}): Promise<ImageResult | null> => {
    try {
      setIsLoading(true);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type || 'image',
          size: asset.fileSize,
          base64: asset.base64 || undefined,
        };
      }
      
      return null;
    } catch (error) {
      log.error('Error picking image from library', error);
      Alert.alert('Error', 'Failed to pick image from library');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async (options: ImagePickerOptions = {}): Promise<ImageResult | null> => {
    try {
      setIsLoading(true);
      
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type || 'image',
          size: asset.fileSize,
          base64: asset.base64 || undefined,
        };
      }
      
      return null;
    } catch (error) {
      log.error('Error taking photo', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const showImagePicker = (): Promise<ImageResult | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await takePhoto();
              resolve(result);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await pickImageFromLibrary();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  };

  const uploadImage = async (image: ImageResult, endpoint: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        log.debug('Image uploaded successfully');
        return true;
      } else {
        log.error('Failed to upload image', { statusText: response.statusText });
        return false;
      }
    } catch (error) {
      log.error('Error uploading image', error);
      Alert.alert('Error', 'Failed to upload image');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = async (uri: string, quality: number = 0.8): Promise<string> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      
      return uri;
    } catch (error) {
      log.error('Error compressing image', error);
      return uri;
    }
  };

  return {
    isLoading,
    pickImageFromLibrary,
    takePhoto,
    showImagePicker,
    uploadImage,
    compressImage,
    requestPermissions,
    requestCameraPermissions,
  };
}
