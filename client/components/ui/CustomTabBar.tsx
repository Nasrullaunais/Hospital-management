// =============================================================================
// Custom Tab Bar Component
// Hospital Management App - Stack-based navigation with custom bottom tabs
// =============================================================================

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { spacing, radius } from '@/constants/ThemeTokens';

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

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Feather
                name={tab.icon}
                size={22}
                color={isActive ? theme.tabBarActive : theme.tabBarInactive}
              />
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.tabBarActive }]} />
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? theme.tabBarActive : theme.tabBarInactive },
                isActive && styles.activeLabel,
              ]}
              numberOfLines={1}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeLabel: {
    fontWeight: '600',
  },
});
