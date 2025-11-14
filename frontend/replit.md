# MapItUP - Campus Navigation System

## Overview
MapItUP is a campus navigation application built with React, TypeScript, and Vite. It provides an interactive map interface for navigating a university campus, with both admin and guest modes.

## Project Information
- **Type**: Frontend React Application
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS (via CDN)
- **Port**: 5000 (development)

## Recent Changes
- **2025-10-29**: Initial Replit setup
  - Configured Vite dev server on port 5000 with host 0.0.0.0
  - Added `allowedHosts: true` to vite.config.ts to support Replit's dynamic host names
  - Set up development workflow
  - Configured deployment for autoscale
  - Verified build process works correctly

- **2025-10-29**: Google Maps Integration for External Navigation
  - Created GoogleMapsDirections component with Google Maps JavaScript API
  - Added dual-mode navigation: Campus Map + Get Directions from Anywhere
  - Integrated location search, geolocation, and click-to-select on map
  - Real-time directions from any location in Timișoara to UPT (Bulevardul Vasile Pârvan 2)
  - Display distance, travel time, and step-by-step navigation instructions
  - Prepared foundation for combining external directions with indoor navigation algorithm
  - Added GOOGLE_MAPS_API_KEY environment variable configuration

- **2025-10-29**: Restructured Navigation System with Dual-Phase Routing
  - **Destination Restriction**: "To" location now restricted to campus buildings only (removed external option)
  - **Integrated View**: Removed separate "Get Directions" tab - all navigation integrated into Campus Map view
  - **Campus-to-Campus Routing**: Shows 2D map with placeholder route visualization (ready for custom algorithm)
  - **External-to-Campus Routing**: Shows full-screen embedded Google Maps with LIVE visual directions to entrance
  - **External Location Selection**: Modal with Google Maps for both search input and click-to-pin location selection
  - **Visual-First Design**: External routes display only map with visual directions (no text instruction sidebar)
  - **Two-Phase Navigation**: External→Entrance (Google Maps) + Entrance→Room (2D algorithm, to be implemented)
  - **Manual Transition**: "I've Arrived at Entrance" floating button to manually switch from Google Maps to 2D indoor navigation
  - **Text Overflow Fix**: Location names truncate with ellipsis to keep Change button always visible
  - **State Management**: Clean separation between selection mode, campus routing, and external routing
  - **UX Flow**: From dropdown → Choose campus/external → (If external: search/click to select) → Find Route → View directions → Arrived button → Indoor nav

- **2025-10-29**: Smart Entrance Selection System
  - **Multi-Entrance Support**: Campus now has 3 entrances - Entrance D1, Main Entrance, and Back Entrance B
  - **Accurate Coordinates**: Using verified Google Maps coordinates for all entrance locations
  - **Proximity-Based Routing**: System automatically calculates closest entrance from external starting location
  - **Haversine Distance**: Uses haversine formula for accurate distance calculation between coordinates
  - **Dynamic Direction**: Google Maps routes to the optimal entrance based on where you're coming from
  - **Visual Markers**: All 3 entrance markers displayed on map with info windows showing entrance names
  - **Smart Button Label**: "I've Arrived at [Entrance Name]" displays the actual selected entrance
  - **Optimized Navigation**: Users coming from different directions are routed to nearest entrance
  - **Indoor Routing Ready**: Indoor navigation starts from the correct entrance after arrival confirmation

- **2025-11-12**: Admin Sign Up System with Token-Based Authentication
  - **Secure Registration**: Admin signup requires a secret token stored in environment variables (not in source code)
  - **Tab-Based Interface**: Login page now has Login and Sign Up tabs for easy navigation
  - **Token Verification**: Only users with the ADMIN_SIGNUP_TOKEN can create admin accounts
  - **Duplicate Prevention**: System prevents duplicate email registrations with proper error messages
  - **State Management**: Admin accounts stored in React state (ready for database integration)
  - **Password Validation**: Enforces minimum 6-character password requirement
  - **User Feedback**: Clear success/error messages for all registration scenarios
  - **Auto-Login Flow**: After successful signup, user is auto-switched to login tab
  - **Environment Check**: Shows error if ADMIN_SIGNUP_TOKEN is not configured
  - **Production Ready**: Token never appears in source code or GitHub repository

## Project Structure
- `/components/` - React components including icons, map views, and UI elements
- `/contexts/` - React contexts (ThemeContext)
- `/pages/` - Main page components (Login, Admin Dashboard, Guest Map)
- `App.tsx` - Main application component with routing logic
- `types.ts` - TypeScript type definitions
- `vite.config.ts` - Vite configuration

## Features
1. **Admin Sign Up & Login**: Secure token-based admin registration system with duplicate prevention
2. **Admin Dashboard**: Manage buildings, timetables, and view analytics with enhanced visualizations
3. **Guest Map View**: Interactive campus map for navigation between buildings
4. **External Directions**: Google Maps integration for directions from anywhere in Timișoara to campus
5. **Theme Switcher**: Light/Dark mode support with cool violet/purple/indigo design
6. **Building Management**: Add, edit, and delete campus buildings
7. **Timetable Management**: Manage room availability schedules

## Development
- Run `npm install` to install dependencies
- Run `npm run dev` to start the development server (port 5000)
- Run `npm run build` to build for production

## Deployment
- Deployment target: autoscale
- Build command: `npm run build`
- Preview command: `npx vite preview --host 0.0.0.0 --port`

## Environment Variables
- **ADMIN_SIGNUP_TOKEN**: Required for admin registration (security token)
  - Set to: `UPT_CAMPUS_EXPLORER_ADMIN_TOKEN` (or your custom token)
  - Add to Replit Secrets for security
  - Never commit this value to source code
  
- **GOOGLE_MAPS_API_KEY**: Required for external directions feature
  - Enable Maps JavaScript API and Directions API in Google Cloud Console
  - Set up billing (Google provides $200 free credit monthly)
  - Add key to Replit Secrets

## Notes
- The app uses client-side state management (no backend required)
- Admin accounts are stored in React state (ready for database migration)
- Default admin account: admin@campus.edu / admin (for testing)
- Google Maps integration loads async with proper error handling
- External directions feature ready to be combined with indoor navigation algorithm

## Security
- All sensitive tokens stored in environment variables (Replit Secrets)
- ADMIN_SIGNUP_TOKEN never appears in source code or GitHub
- Admin passwords are stored in plain text in state (should be hashed when connected to database)
- Token verification happens before allowing admin account creation
