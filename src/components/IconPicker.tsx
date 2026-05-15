import * as React from 'react'
import {
  Briefcase, Building, BarChart, LineChart, PieChart, Activity, Heart,
  Star, Target, Zap, Settings, Wrench, Shield, Key, Lock, Unlock,
  Users, User, UserPlus, UserCheck, MessageSquare, MessageCircle, Mail,
  Phone, Video, Camera, Image as ImageIcon, Music, MapPin, Navigation, Compass,
  Calendar, Clock, Timer, Hourglass, Folder, FolderOpen, FileText, File,
  Clipboard, ClipboardList, ClipboardCheck, Paperclip, Link, Globe, Cloud,
  Database, Server, HardDrive, Cpu, Laptop, Smartphone, Tablet, Monitor,
  Printer, Camera as Camera2, Video as Video2, Tv, Radio, Mic, Headphones,
  Book, BookOpen, Bookmark, Tag, ShoppingCart, ShoppingBag, CreditCard,
  Wallet, DollarSign, Euro, PoundSterling, Percent, Calculator, PenTool,
  Edit2, Edit3, Type, Layers, Box, Package, Archive, Inbox, Send, RefreshCw,
  Repeat, Shuffle, Maximize, Minimize, ZoomIn, ZoomOut, Search, Crosshair,
  Flag, Anchor, Bell, Check, Plus, Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const BUSINESS_ICONS = {
  Briefcase, Building, BarChart, LineChart, PieChart, Activity, Heart,
  Star, Target, Zap, Settings, Wrench, Shield, Key, Lock, Unlock,
  Users, User, UserPlus, UserCheck, MessageSquare, MessageCircle, Mail,
  Phone, Video, Camera, ImageIcon, Music, MapPin, Navigation, Compass,
  Calendar, Clock, Timer, Hourglass, Folder, FolderOpen, FileText, File,
  Clipboard, ClipboardList, ClipboardCheck, Paperclip, Link, Globe, Cloud,
  Database, Server, HardDrive, Cpu, Laptop, Smartphone, Tablet, Monitor,
  Printer, Tv, Radio, Mic, Headphones,
  Book, BookOpen, Bookmark, Tag, ShoppingCart, ShoppingBag, CreditCard,
  Wallet, DollarSign, Euro, PoundSterling, Percent, Calculator, PenTool,
  Edit2, Edit3, Type, Layers, Box, Package, Archive, Inbox, Send, RefreshCw,
  Repeat, Shuffle, Maximize, Minimize, ZoomIn, ZoomOut, Search, Crosshair,
  Flag, Anchor, Bell, Check, Plus, Minus
}

export type IconName = keyof typeof BUSINESS_ICONS

interface IconPickerProps {
  selected?: IconName
  onSelect: (icon: IconName) => void
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2 p-2 h-64 overflow-y-auto custom-scrollbar">
      {Object.entries(BUSINESS_ICONS).map(([name, IconComponent]) => (
        <button
          key={name}
          type="button"
          title={name}
          onClick={() => onSelect(name as IconName)}
          className={cn(
            "p-2 flex items-center justify-center rounded-md hover:bg-primary/20 transition-colors",
            selected === name ? "bg-primary/20 ring-1 ring-primary" : "bg-transparent text-muted-foreground",
            "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          )}
        >
          <IconComponent className="w-5 h-5" />
        </button>
      ))}
    </div>
  )
}

export function RenderIcon({ name, className }: { name?: string, className?: string }) {
  if (!name || !(name in BUSINESS_ICONS)) return null
  const IconComponent = BUSINESS_ICONS[name as IconName]
  return <IconComponent className={cn("text-blue-500 dark:text-blue-400", className)} />
}
