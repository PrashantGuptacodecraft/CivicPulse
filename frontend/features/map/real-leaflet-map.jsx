'use client';
import React, { useEffect, useRef } from 'react';

// Tile layer URLs and attributions
export const TILE_PROVIDERS = {
  carto: {
    name: 'Clean Civic (CARTO)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

const STATUS_COLORS = {
  SUBMITTED: { bg: '#F59E0B', text: '#FFFFFF', ring: '#D97706' },
  ASSIGNED: { bg: '#6366F1', text: '#FFFFFF', ring: '#4F46E5' },
  IN_PROGRESS: { bg: '#3B82F6', text: '#FFFFFF', ring: '#2563EB' },
  RESOLVED: { bg: '#10B981', text: '#FFFFFF', ring: '#059669' },
  CLOSED: { bg: '#64748B', text: '#FFFFFF', ring: '#475569' },
  REOPENED: { bg: '#EF4444', text: '#FFFFFF', ring: '#DC2626' },
};

const SEVERITY_BADGES = {
  CRITICAL: { bg: '#DC2626', icon: '⚠️' },
  HIGH: { bg: '#EA580C', icon: '🔶' },
  MEDIUM: { bg: '#2563EB', icon: '🔹' },
  LOW: { bg: '#64748B', icon: '⚪' },
};

export function RealLeafletMap({
  center = { latitude: 18.5314, longitude: 73.8446 },
  zoom = 13,
  selectedPoint = null,
  onSelectPoint = null,
  issues = [],
  selectedIssue = null,
  onSelectIssue = null,
  isClustered = false,
  tileProvider = 'carto',
  showBoundaries = true,
  disabled = false,
  className = 'w-full h-full',
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const boundariesLayerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [center.latitude, center.longitude],
        zoom: zoom,
        zoomControl: false,
        attributionControl: true,
      });
      mapInstanceRef.current = map;

      // Add Base Tile Layer
      const providerConfig = TILE_PROVIDERS[tileProvider] || TILE_PROVIDERS.carto;
      const tileLayer = L.tileLayer(providerConfig.url, {
        attribution: providerConfig.attribution,
        maxZoom: providerConfig.maxZoom || 19,
        subdomains: providerConfig.subdomains || 'abc',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Group Layers
      boundariesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Handle map clicks for point picking
      if (onSelectPoint && !disabled) {
        map.on('click', (e) => {
          const lat = parseFloat(e.latlng.lat.toFixed(6));
          const lng = parseFloat(e.latlng.lng.toFixed(6));
          onSelectPoint({ latitude: lat, longitude: lng });
        });
      }

      // Render Boundaries if enabled
      if (showBoundaries && boundariesLayerRef.current) {
        // PCMC Northern Zone
        L.polygon(
          [
            [18.575, 73.74],
            [18.68, 73.74],
            [18.68, 73.94],
            [18.575, 73.94],
          ],
          {
            color: '#8B5CF6',
            weight: 1.5,
            dashArray: '4,4',
            fillColor: '#8B5CF6',
            fillOpacity: 0.05,
          }
        ).bindTooltip('PCMC Jurisdiction', { sticky: true }).addTo(boundariesLayerRef.current);

        // PMC Southern Zone
        L.polygon(
          [
            [18.44, 73.76],
            [18.575, 73.76],
            [18.575, 73.96],
            [18.44, 73.96],
          ],
          {
            color: '#2563EB',
            weight: 1.5,
            dashArray: '4,4',
            fillColor: '#2563EB',
            fillOpacity: 0.05,
          }
        ).bindTooltip('PMC Jurisdiction', { sticky: true }).addTo(boundariesLayerRef.current);

        // Ambiguity Buffer Zone along Mula/Mutha River
        L.rectangle(
          [
            [18.572, 73.74],
            [18.578, 73.96],
          ],
          {
            color: '#F59E0B',
            weight: 1,
            dashArray: '3,3',
            fillColor: '#F59E0B',
            fillOpacity: 0.12,
          }
        ).bindTooltip('⚡ Ambiguity Buffer Zone (Mula River Border)', { sticky: true }).addTo(boundariesLayerRef.current);
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Update Tile Layer if provider changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const providerConfig = TILE_PROVIDERS[tileProvider] || TILE_PROVIDERS.carto;
      tileLayerRef.current = L.tileLayer(providerConfig.url, {
        attribution: providerConfig.attribution,
        maxZoom: providerConfig.maxZoom || 19,
        subdomains: providerConfig.subdomains || 'abc',
      }).addTo(mapInstanceRef.current);
    });
  }, [tileProvider]);

  // Update Point Picker Pin
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current) return;

      if (pinMarkerRef.current) {
        mapInstanceRef.current.removeLayer(pinMarkerRef.current);
        pinMarkerRef.current = null;
      }

      if (selectedPoint?.latitude && selectedPoint?.longitude) {
        const pinIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `
            <div style="position: relative; transform: translate(-50%, -100%);">
              <div style="width: 32px; height: 32px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; items-center; justify-content: center;">
                <div style="width: 10px; height: 10px; background: #FFFFFF; border-radius: 50%; transform: rotate(45deg); margin: 8px 0 0 8px;"></div>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([selectedPoint.latitude, selectedPoint.longitude], {
          icon: pinIcon,
          draggable: !disabled && !!onSelectPoint,
        }).addTo(mapInstanceRef.current);

        if (!disabled && onSelectPoint) {
          marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            onSelectPoint({
              latitude: parseFloat(pos.lat.toFixed(6)),
              longitude: parseFloat(pos.lng.toFixed(6)),
            });
          });
        }

        pinMarkerRef.current = marker;
      }
    });
  }, [selectedPoint, disabled, onSelectPoint]);

  // Update Issues / Markers Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;

      markersLayerRef.current.clearLayers();

      if (!issues || issues.length === 0) return;

      issues.forEach((issue) => {
        if (!issue.latitude || !issue.longitude) return;

        const isSelected = selectedIssue?.id === issue.id;
        const statusCfg = STATUS_COLORS[issue.status] || STATUS_COLORS.SUBMITTED;
        const severityCfg = SEVERITY_BADGES[issue.severity] || SEVERITY_BADGES.MEDIUM;
        const isCritical = issue.severity === 'CRITICAL';
        const markerSize = isCritical ? 36 : 30;

        const html = `
          <div style="position: relative; cursor: pointer; transform: translate(-50%, -50%);">
            ${isCritical ? '<div style="position: absolute; top:-6px; left:-6px; width:48px; height:48px; border-radius:50%; background:#EF4444; opacity:0.35; animation: pulse 1.5s infinite;"></div>' : ''}
            <div style="width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; background: ${statusCfg.bg}; border: 2.5px solid ${isSelected ? '#1E293B' : '#FFFFFF'}; box-shadow: 0 4px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; font-size: 13px; transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition: transform 0.15s ease;">
              <span>${severityCfg.icon}</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'civiq-issue-marker',
          html,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        });

        const marker = L.marker([issue.latitude, issue.longitude], { icon });

        // Tooltip
        marker.bindTooltip(
          `
          <div style="font-family: inherit; font-size: 11px; padding: 2px;">
            <strong style="display:block; color:#0F172A; margin-bottom:2px;">${issue.title}</strong>
            <span style="color:#64748B;">Dept: ${issue.department} • Status: ${issue.status}</span>
          </div>
          `,
          { direction: 'top', offset: [0, -10] }
        );

        if (onSelectIssue) {
          marker.on('click', () => onSelectIssue(issue));
        }

        marker.addTo(markersLayerRef.current);
      });
    });
  }, [issues, selectedIssue, onSelectIssue]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '260px', width: '100%', height: '100%' }}
    />
  );
}
