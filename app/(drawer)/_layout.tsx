import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '../../components/ui';
import {
  isDashboardActive,
  isPosRouteActive,
  isRouteActive,
} from '../../utils/drawerNav';

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();

  const [isManagementExpanded, setManagementExpanded] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);

  const go = (href: string, isActive: boolean) => {
    if (isActive) {
      props.navigation.closeDrawer();
      return;
    }

    router.push(href as never);
    props.navigation.closeDrawer();
  };

  useEffect(() => {
    ScreenOrientation.getOrientationAsync().then((orientation) => {
      const isL =
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

      setIsLandscape(isL);
    });

    const subscription =
      ScreenOrientation.addOrientationChangeListener((event) => {
        const isL =
          event.orientationInfo.orientation ===
            ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          event.orientationInfo.orientation ===
            ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

        setIsLandscape(isL);
      });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  const toggleOrientation = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    }
  };

  const isMgmtActive = [
    '/products',
    '/categories',
    '/recipes',
    '/ingredients',
  ].some((p) => pathname.includes(p));

  const isPosActive = isPosRouteActive(pathname);
  const isDashboard = isDashboardActive(pathname);

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Spacing.md,
        }}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/adaptiveIcon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View>
            <Text style={styles.drawerTitle}>DRIPO POS</Text>
            <Text style={styles.drawerSubtitle}>
              Make Every Drip Count
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <DrawerItem
          label="Dashboard"
          icon={({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => go('/(drawer)', isDashboard)}
          focused={isDashboard}
          activeTintColor={Colors.primary}
          inactiveTintColor={Colors.text}
          labelStyle={styles.drawerLabel}
        />

        <TouchableOpacity
          style={styles.dropdownHeader}
          onPress={() =>
            setManagementExpanded(!isManagementExpanded)
          }
          activeOpacity={0.7}
        >
          <View style={styles.dropdownHeaderLeft}>
            <Ionicons
              name="grid-outline"
              size={24}
              color={
                isMgmtActive ? Colors.primary : Colors.text
              }
            />

            <Text
              style={[
                styles.dropdownHeaderText,
                isMgmtActive && { color: Colors.primary },
              ]}
            >
              Management
            </Text>
          </View>

          <Ionicons
            name={
              isManagementExpanded
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={20}
            color={
              isMgmtActive ? Colors.primary : Colors.text
            }
          />
        </TouchableOpacity>

        {isManagementExpanded && (
          <View style={styles.dropdownContent}>
            <DrawerItem
              label="Product Menu"
              icon={({ color, size }) => (
                <Ionicons
                  name="fast-food-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() =>
                go(
                  '/(drawer)/products',
                  isRouteActive(pathname, '/products')
                )
              }
              focused={isRouteActive(pathname, '/products')}
              activeTintColor={Colors.primary}
              inactiveTintColor={Colors.textSecondary}
              labelStyle={styles.subLabel}
            />

            <DrawerItem
              label="Categories"
              icon={({ color, size }) => (
                <Ionicons
                  name="pricetags-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() =>
                go(
                  '/(drawer)/categories',
                  isRouteActive(pathname, '/categories')
                )
              }
              focused={isRouteActive(pathname, '/categories')}
              activeTintColor={Colors.primary}
              inactiveTintColor={Colors.textSecondary}
              labelStyle={styles.subLabel}
            />

            <DrawerItem
              label="HPP (Recipes)"
              icon={({ color, size }) => (
                <Ionicons
                  name="flask-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() =>
                go(
                  '/(drawer)/recipes',
                  isRouteActive(pathname, '/recipes')
                )
              }
              focused={isRouteActive(pathname, '/recipes')}
              activeTintColor={Colors.primary}
              inactiveTintColor={Colors.textSecondary}
              labelStyle={styles.subLabel}
            />

            <DrawerItem
              label="Inventory (Stock)"
              icon={({ color, size }) => (
                <Ionicons
                  name="cube-outline"
                  size={size}
                  color={color}
                />
              )}
              onPress={() =>
                go(
                  '/(drawer)/ingredients',
                  isRouteActive(pathname, '/ingredients')
                )
              }
              focused={isRouteActive(pathname, '/ingredients')}
              activeTintColor={Colors.primary}
              inactiveTintColor={Colors.textSecondary}
              labelStyle={styles.subLabel}
            />
          </View>
        )}

        <View style={styles.separator} />

        <DrawerItem
          label="Sale"
          icon={({ color, size }) => (
            <Ionicons
              name="bag-handle-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() => go('/pos', isPosActive)}
          focused={isPosActive}
          activeTintColor={Colors.primary}
          inactiveTintColor={Colors.text}
          labelStyle={styles.drawerLabel}
        />

        <DrawerItem
          label="Transactions"
          icon={({ color, size }) => (
            <Ionicons
              name="receipt-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() =>
            go(
              '/transactions',
              isRouteActive(pathname, '/transactions')
            )
          }
          focused={isRouteActive(pathname, '/transactions')}
          activeTintColor={Colors.primary}
          inactiveTintColor={Colors.text}
          labelStyle={styles.drawerLabel}
        />

        <DrawerItem
          label="Reports & Sales"
          icon={({ color, size }) => (
            <Ionicons
              name="bar-chart-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() =>
            go(
              '/reports',
              isRouteActive(pathname, '/reports')
            )
          }
          focused={isRouteActive(pathname, '/reports')}
          activeTintColor={Colors.primary}
          inactiveTintColor={Colors.text}
          labelStyle={styles.drawerLabel}
        />

        <DrawerItem
          label="Settings"
          icon={({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={color}
            />
          )}
          onPress={() =>
            go(
              '/settings',
              isRouteActive(pathname, '/settings')
            )
          }
          focused={isRouteActive(pathname, '/settings')}
          activeTintColor={Colors.primary}
          inactiveTintColor={Colors.text}
          labelStyle={styles.drawerLabel}
        />
      </DrawerContentScrollView>

      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.rotateButtonFloating}
          onPress={toggleOrientation}
          activeOpacity={0.7}
        >
          <Ionicons
            name={
              isLandscape
                ? 'phone-portrait-outline'
                : 'phone-landscape-outline'
            }
            size={22}
            color={Colors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const drawerWidth = isLandscape
    ? Math.min(Math.round(width * 0.42), 480)
    : width >= 400
      ? 350
      : width;

  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent {...props} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: Colors.background,
          width: drawerWidth,
        },
      }}
    >
      <Drawer.Screen name="index" />
      <Drawer.Screen name="pos" />
      <Drawer.Screen name="products" />
      <Drawer.Screen name="recipes" />
      <Drawer.Screen name="ingredients" />
      <Drawer.Screen name="categories" />
      <Drawer.Screen name="transactions" />
      <Drawer.Screen name="reports" />
      <Drawer.Screen name="settings" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  logoImage: {
    width: 55,
    height: 55,
  },

  drawerTitle: {
    color: Colors.text,
    fontSize: Typography.xl,
    fontWeight: '800',
  },

  drawerSubtitle: {
    color: Colors.primary,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },

  drawerLabel: {
    fontSize: Typography.md,
    fontWeight: '600',
    marginLeft: -Spacing.sm,
  },

  subLabel: {
    fontSize: Typography.sm,
    fontWeight: '500',
    marginLeft: -Spacing.sm,
  },

  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: Spacing.xs,
  },

  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: 2,
  },

  dropdownHeaderText: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
    marginLeft: -8,
  },

  dropdownContent: {
    paddingLeft: Spacing.md,
  },

  drawerFooter: {
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
    alignItems: 'flex-end',
  },

  rotateButtonFloating: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});