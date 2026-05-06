/**
 * pages.config.js — page routing configuration.
 *
 * Heavy pages (Studio, Design, SharedDesign, admin pages) are wrapped in
 * React.lazy() so their JS chunks aren't pulled into the initial bundle.
 * The Home/Pricing/Projects/Favorites paths stay eager because they're
 * tiny and on the critical path.
 *
 * If you add a new heavy page (3D, large dependency, admin-only), prefer
 * lazy() to keep the landing page snappy.
 */
import { lazy } from 'react';

// Eager — small components on the critical path
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Projects from './pages/Projects';
import Favorites from './pages/Favorites';
import __Layout from './Layout.jsx';

// Lazy — heavy components or rarely-visited pages
const Studio          = lazy(() => import('./pages/Studio'));
const Design          = lazy(() => import('./pages/Design'));
const SharedDesign    = lazy(() => import('./pages/SharedDesign'));
const CatalogImport   = lazy(() => import('./pages/CatalogImport'));


export const PAGES = {
    "CatalogImport": CatalogImport,
    "Design": Design,
    "Favorites": Favorites,
    "Home": Home,
    "Pricing": Pricing,
    "Projects": Projects,
    "SharedDesign": SharedDesign,
    "Studio": Studio,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
