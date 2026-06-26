"use client";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ic = (path: string) =>
  function Icon({ size = 16, color = "currentColor", className, style }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style}>
        {path.split("|").map((d, i) => (
          d.startsWith("fill:") ? <path key={i} d={d.slice(5)} fill={color} stroke="none" />
          : d.startsWith("circle:") ? (() => { const [cx,cy,r] = d.slice(7).split(","); return <circle key={i} cx={cx} cy={cy} r={r} />; })()
          : d.startsWith("rect:") ? (() => { const [x,y,w,h,rx] = d.slice(5).split(","); return <rect key={i} x={x} y={y} width={w} height={h} rx={rx||"0"} />; })()
          : d.startsWith("line:") ? (() => { const [x1,y1,x2,y2] = d.slice(5).split(","); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />; })()
          : d.startsWith("poly:") ? <polygon key={i} points={d.slice(5)} />
          : <path key={i} d={d} />
        ))}
      </svg>
    );
  };

export const Icons = {
  // Navigation
  Home:       ic("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z|M9 22V12h6v10"),
  Folder:     ic("M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"),
  Brand:      ic("M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5"),
  Music:      ic("M9 18V5l12-2v13|circle:6,18,3|circle:18,16,3"),
  Text:       ic("M4 6h16M4 12h16M4 18h7"),
  Transition: ic("M5 12h14|M12 5l7 7-7 7"),
  Effects:    ic("M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"),
  AI:         ic("M12 2a4 4 0 014 4v1h1a3 3 0 010 6h-1v1a4 4 0 01-8 0v-1H7a3 3 0 010-6h1V6a4 4 0 014-4z"),
  Chat:       ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"),
  Settings:   ic("circle:12,12,3|M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"),

  // Actions
  Plus:       ic("M12 5v14|M5 12h14"),
  Close:      ic("M18 6L6 18|M6 6l12 12"),
  Search:     ic("circle:11,11,8|M21 21l-4.35-4.35"),
  ArrowRight: ic("M5 12h14|M12 5l7 7-7 7"),
  ArrowLeft:  ic("M19 12H5|M12 19l-7-7 7-7"),
  ChevronDown:ic("M6 9l6 6 6-6"),
  ChevronRight:ic("M9 18l6-6-6-6"),
  ChevronLeft:ic("M15 18l-6-6 6-6"),
  MoreHoriz:  ic("circle:12,12,1|circle:19,12,1|circle:5,12,1"),
  MoreVert:   ic("circle:12,12,1|circle:12,5,1|circle:12,19,1"),
  External:   ic("M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6|M15 3h6v6|M10 14L21 3"),
  Copy:       ic("rect:9,9,13,13,2|M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"),
  Trash:      ic("M3 6h18|M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6|M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"),
  Edit:       ic("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7|M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"),
  Duplicate:  ic("rect:8,8,13,13,2|M4 16V4a2 2 0 012-2h10"),
  Upload:     ic("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M17 8l-5-5-5 5|M12 3v12"),
  Download:   ic("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M7 10l5 5 5-5|M12 15V3"),
  Undo:       ic("M9 14L4 9l5-5|M20 20v-7a4 4 0 00-4-4H4"),
  Redo:       ic("M15 14l5-5-5-5|M4 20v-7a4 4 0 014-4h12"),

  // Media / Timeline
  Play:       ic("poly:5,3 19,12 5,21 5,3"),
  Pause:      ic("rect:6,4,4,16,1|rect:14,4,4,16,1"),
  Stop:       ic("rect:4,4,16,16,3"),
  SkipBack:   ic("M19 20L9 12l10-8v16z|M5 19V5"),
  SkipForward:ic("M5 4l10 8-10 8V4z|M19 5v14"),
  Volume:     ic("M11 5L6 9H2v6h4l5 4V5z|M15.54 8.46a5 5 0 010 7.07"),
  VolumeOff:  ic("M11 5L6 9H2v6h4l5 4V5z|M23 9l-6 6|M17 9l6 6"),
  Layers:     ic("M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5"),
  Scissors:   ic("circle:6,6,3|circle:6,18,3|M20 4L8.12 15.88|M14.47 14.48L20 20|M8.12 8.12L12 12"),
  Wand:       ic("M15 4V2|M15 16v-2|M8 9h2|M20 9h2|M17.8 11.8L19.2 13.2|M10.2 4.8L11.6 6.2|M17.8 6.2L19.2 4.8|M10.2 13.2L11.6 11.8|M13 2L3 22"),

  // Status / Info
  Check:      ic("M20 6L9 17l-5-5"),
  CheckCircle:ic("circle:12,12,10|M9 12l2 2 4-4"),
  Info:       ic("circle:12,12,10|M12 8v4|M12 16h.01"),
  Warning:    ic("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z|M12 9v4|M12 17h.01"),
  Error:      ic("circle:12,12,10|M15 9l-6 6|M9 9l6 6"),
  Lock:       ic("rect:3,11,18,11,2|M7 11V7a5 5 0 0110 0v4"),
  Unlock:     ic("rect:3,11,18,11,2|M7 11V7a5 5 0 019.9-1"),
  Eye:        ic("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|circle:12,12,3"),
  EyeOff:     ic("M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94|M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19|M1 1l22 22"),
  Star:       ic("poly:12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"),
  Sparkles:   ic("M12 3l1.45 4.5H18l-3.73 2.7 1.43 4.4L12 12.1l-3.7 2.5 1.43-4.4L6 7.5h4.55L12 3z"),

  // File / Export
  File:       ic("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z|M14 2v6h6"),
  Film:       ic("rect:2,2,20,20,2|M7 2v20|M17 2v20|M2 12h5|M17 12h5|M2 7h5|M17 7h5|M2 17h5|M17 17h5"),
  Export:     ic("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M17 8l-5-5-5 5|M12 3v12"),
  Share:      ic("circle:18,5,3|circle:6,12,3|circle:18,19,3|M8.59 13.51l6.83 3.98|M15.41 6.51L8.59 10.49"),

  // User
  User:       ic("circle:12,8,4|M4 20c0-4 3.58-7 8-7s8 3 8 7"),
  Users:      ic("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|circle:9,7,4|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75"),
  LogOut:     ic("M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4|M16 17l5-5-5-5|M21 12H9"),

  // Layout
  Grid:       ic("rect:3,3,7,7,1|rect:14,3,7,7,1|rect:14,14,7,7,1|rect:3,14,7,7,1"),
  List:       ic("M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01"),
  Layout:     ic("rect:3,3,18,18,2|M3 9h18|M9 21V9"),
  Sidebar:    ic("rect:3,3,18,18,2|M9 3v18"),
  PanelLeft:  ic("rect:3,3,18,18,2|M9 3v18"),
  Maximize:   ic("M8 3H5a2 2 0 00-2 2v3|M21 8V5a2 2 0 00-2-2h-3|M3 16v3a2 2 0 002 2h3|M16 21h3a2 2 0 002-2v-3"),
  ZoomIn:     ic("circle:11,11,8|M21 21l-4.35-4.35|M11 8v6|M8 11h6"),
  ZoomOut:    ic("circle:11,11,8|M21 21l-4.35-4.35|M8 11h6"),
};

export type IconName = keyof typeof Icons;
