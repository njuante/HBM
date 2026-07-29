import {
  Banknote,
  Book,
  Briefcase,
  Bus,
  Car,
  CreditCard,
  Dog,
  Droplet,
  Dumbbell,
  Ellipsis,
  Flame,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Key,
  Landmark,
  Laptop,
  PartyPopper,
  PiggyBank,
  Plane,
  Plug,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapa explícito nombre → componente. A propósito no es dinámico: importar
 * lucide por nombre en tiempo de ejecución arrastra el paquete entero al
 * bundle. Esta lista es también el catálogo que ve el usuario al elegir
 * icono de categoría.
 */
export const ICONOS_CATEGORIA: Record<string, LucideIcon> = {
  house: House,
  plug: Plug,
  zap: Zap,
  droplet: Droplet,
  flame: Flame,
  wifi: Wifi,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  bus: Bus,
  plane: Plane,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "party-popper": PartyPopper,
  "graduation-cap": GraduationCap,
  book: Book,
  laptop: Laptop,
  smartphone: Smartphone,
  shirt: Shirt,
  scissors: Scissors,
  dog: Dog,
  gift: Gift,
  wrench: Wrench,
  receipt: Receipt,
  "credit-card": CreditCard,
  landmark: Landmark,
  wallet: Wallet,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  briefcase: Briefcase,
  key: Key,
  "trending-up": TrendingUp,
  sparkles: Sparkles,
  ellipsis: Ellipsis,
  tag: Tag,
};

/** Nombres disponibles, en el orden en que se ofrecen al elegir icono. */
export const NOMBRES_ICONO = Object.keys(ICONOS_CATEGORIA);

/** Devuelve el icono de una categoría, con `Tag` como reserva. */
export function iconoCategoria(nombre?: string | null): LucideIcon {
  return (nombre && ICONOS_CATEGORIA[nombre]) || Tag;
}
