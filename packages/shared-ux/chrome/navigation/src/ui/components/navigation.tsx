/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
  useContext,
  useRef,
} from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { useNavigation as useNavigationServices } from '../../services';
import { RegisterFunction, UnRegisterFunction } from '../types';
import { CloudLink } from './cloud_link';
import { NavigationFooter } from './navigation_footer';
import { NavigationGroup } from './navigation_group';
import { NavigationItem } from './navigation_item';
import { NavigationUI } from './navigation_ui';
import { RecentlyAccessed } from './recently_accessed';

interface Context {
  register: RegisterFunction;
  updateFooterChildren: (children: ReactNode) => void;
  unstyled: boolean;
}

const NavigationContext = createContext<Context>({
  register: () => ({
    unregister: () => {},
    path: [],
  }),
  updateFooterChildren: () => {},
  unstyled: false,
});

interface Props {
  children: ReactNode;
  /**
   * Href to the home page
   */
  homeRef: string;
  /**
   * Flag to indicate if the Navigation should not be styled with EUI components.
   * If set to true, the children will be rendered as is.
   */
  unstyled?: boolean;
  dataTestSubj?: string;
}

export function Navigation({ children, homeRef, unstyled = false, dataTestSubj }: Props) {
  const { onProjectNavigationChange } = useNavigationServices();

  // We keep a reference of the order of the children that register themselves when mounting.
  // This guarantees that the navTree items sent to the Chrome service has the same order
  // that the nodes in the DOM.
  const orderChildrenRef = useRef<Record<string, number>>({});
  const idx = useRef(0);

  const [navigationItems, setNavigationItems] = useState<
    Record<string, ChromeProjectNavigationNode>
  >({});
  const [footerChildren, setFooterChildren] = useState<ReactNode>(null);

  const unregister: UnRegisterFunction = useCallback((id: string) => {
    setNavigationItems((prevItems) => {
      const updatedItems = { ...prevItems };
      delete updatedItems[id];
      return updatedItems;
    });
  }, []);

  const register = useCallback(
    (navNode: ChromeProjectNavigationNode) => {
      orderChildrenRef.current[navNode.id] = idx.current++;

      setNavigationItems((prevItems) => {
        return {
          ...prevItems,
          [navNode.id]: navNode,
        };
      });

      return {
        unregister,
        path: [navNode.id],
      };
    },
    [unregister]
  );

  const contextValue = useMemo<Context>(
    () => ({
      register,
      updateFooterChildren: setFooterChildren,
      unstyled,
    }),
    [register, unstyled]
  );

  useEffect(() => {
    // This will update the navigation tree in the Chrome service (calling the serverless.setNavigation())
    onProjectNavigationChange({
      homeRef,
      navigationTree: Object.values(navigationItems).sort((a, b) => {
        const aOrder = orderChildrenRef.current[a.id];
        const bOrder = orderChildrenRef.current[b.id];
        return aOrder - bOrder;
      }),
    });
  }, [navigationItems, onProjectNavigationChange, homeRef]);

  return (
    <NavigationContext.Provider value={contextValue}>
      <NavigationUI
        homeRef={homeRef}
        footerChildren={footerChildren}
        unstyled={unstyled}
        dataTestSubj={dataTestSubj}
      >
        {children}
      </NavigationUI>
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a Navigation provider');
  }
  return context;
}

Navigation.Group = NavigationGroup;
Navigation.Item = NavigationItem;
Navigation.Footer = NavigationFooter;
Navigation.CloudLink = CloudLink;
Navigation.RecentlyAccessed = RecentlyAccessed;
