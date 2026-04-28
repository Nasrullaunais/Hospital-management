// =============================================================================
// Custom Tab Bar Component
// Hospital Management App - Stack-based navigation with custom bottom tabs
// =============================================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export interface TabItem {
  key: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}

interface CustomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  tabs: TabItem[];
}

export function CustomTabBar({ activeTab, onTabPress, tabs }: CustomTabBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const animatedIndex = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;

  useEffect(() => {
    const targetIndex = activeIndex >= 0 ? activeIndex : 0;
    Animated.spring(animatedIndex, {
      toValue: targetIndex,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    }).start();
  }, [activeIndex, animatedIndex]);

  const pillOpacity = animatedIndex.interpolate({
    inputRange: [0, tabs.length - 1],
    outputRange: [1, 1],
  });

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.surface,
          paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
          ...shadows.card,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tabItem,
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={() => activeTab !== tab.key && onTabPress(tab.key)}
            >
              <View style={styles.iconWrapper}>
                <View
                  style={[
                    styles.pillBackground,
                    {
                      backgroundColor: theme.tabBarActiveBg,
                      opacity: isActive ? 1 : 0,
                    },
                  ]}
                />
                <Feather
                  name={tab.icon}
                  size={20}
                  color={isActive ? theme.tabBarActive : theme.tabBarInactive}
                />
                {isActive && (
                  <View
                    style={[
                      styles.coralDot,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.tabBarActive : theme.tabBarInactive,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    paddingTop: spacing.sm,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 36,
  },
  pillBackground: {
    position: 'absolute',
    width: 40,
    height: 32,
    borderRadius: radius.full,
  },
  coralDot: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  tabLabel: {
    fontSize: 10,
  },
});
