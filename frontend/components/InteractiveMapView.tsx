import React, { useState, useRef, WheelEvent, MouseEvent, useLayoutEffect } from 'react';

interface Transform {
  x: number;
  y: number;
  k: number;
}

interface Point {
    x: number;
    y: number;
}

interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface InteractiveMapViewProps {
  children: React.ReactNode;
  width: string;
  height: string;
}

const InteractiveMapView: React.FC<InteractiveMapViewProps> = ({ children, width, height }) => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 800, height: 600 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    // This observer recalculates the viewBox on resize, ensuring the map always fits the container.
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && gRef.current) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;

        if (containerWidth > 0 && containerHeight > 0) {
          const bbox = gRef.current.getBBox();
          
          if (bbox.width > 0 && bbox.height > 0) {
              const contentBox = {
                  x: bbox.x,
                  y: bbox.y,
                  width: bbox.width,
                  height: bbox.height,
              };

              const containerAspect = containerWidth / containerHeight;
              const contentAspect = contentBox.width / contentBox.height;

              let finalViewBox: ViewBox;
              if (containerAspect > contentAspect) {
                  // Container is wider than content, so expand viewBox width to match aspect ratio.
                  const newWidth = contentBox.height * containerAspect;
                  finalViewBox = {
                      x: contentBox.x - (newWidth - contentBox.width) / 2,
                      y: contentBox.y,
                      width: newWidth,
                      height: contentBox.height,
                  };
              } else {
                  // Container is taller than content, so expand viewBox height.
                  const newHeight = contentBox.width / containerAspect;
                  finalViewBox = {
                      x: contentBox.x,
                      y: contentBox.y - (newHeight - contentBox.height) / 2,
                      width: contentBox.width,
                      height: newHeight,
                  };
              }
              setViewBox(finalViewBox);
          } else {
            // Fallback for empty SVG, use container dimensions.
            setViewBox({ x: 0, y: 0, width: containerWidth, height: containerHeight });
          }
          // Reset pan/zoom when content or size changes.
          setTransform({ x: 0, y: 0, k: 1 });
        }
      }
    });
    
    resizeObserver.observe(svgElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);


  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const scaleFactor = 1.1;
    const { deltaY } = e;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // The point in the SVG coordinate system under the mouse
    const pointX = (mouseX - transform.x) / transform.k;
    const pointY = (mouseY - transform.y) / transform.k;

    const newScale = deltaY < 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    
    if (newScale < 1) {
        setTransform({ x: 0, y: 0, k: 1 });
        return;
    }

    const maxScale = 10;
    const clampedScale = clamp(newScale, 1, maxScale);
    
    if (clampedScale === transform.k) return;

    // New translation to keep the point under the mouse stationary
    const newX = mouseX - pointX * clampedScale;
    const newY = mouseY - pointY * clampedScale;

    // Clamping the translation based on the SVG element's pixel dimensions.
    const maxX = 0;
    const minX = rect.width * (1 - clampedScale);
    const maxY = 0;
    const minY = rect.height * (1 - clampedScale);

    setTransform({
        x: clamp(newX, minX, maxX),
        y: clamp(newY, minY, maxY),
        k: clampedScale
    });
  };
  
  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (transform.k <= 1) return; // Don't pan if not zoomed in
    e.preventDefault();
    setIsPanning(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !svgRef.current) return;
    e.preventDefault();
    
    const rect = svgRef.current.getBoundingClientRect();
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    
    const newX = transform.x + dx;
    const newY = transform.y + dy;

    // Clamping logic based on the SVG element's pixel dimensions.
    const maxX = 0;
    const minX = rect.width * (1 - transform.k);
    const maxY = 0;
    const minY = rect.height * (1 - transform.k);
    
    setTransform({
        x: clamp(newX, minX, maxX),
        y: clamp(newY, minY, maxY),
        k: transform.k
    });
    setStartPoint({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUpOrLeave = (e: MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
        e.preventDefault();
        setIsPanning(false);
    }
  };

  return (
    <svg 
      ref={svgRef} 
      width={width} 
      height={height}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      onWheel={handleWheel} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      style={{ 
        cursor: isPanning ? 'grabbing' : (transform.k > 1 ? 'grab' : 'default'),
        touchAction: 'none'
      }}
      aria-label="Interactive campus map"
    >
      <g ref={gRef} transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
        {children}
      </g>
    </svg>
  );
};

export default InteractiveMapView;
