import { Star, TrendingUp, Sparkles, Wallet, Megaphone, Clock, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGridClasses } from "@/hooks/useDisplaySettings";

export interface Product {
  id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  image: string;
  coming_soon?: boolean;
  wallet_points?: number;
}

interface ProductRowProps {
  title: string;
  products: Product[];
  linkPrefix?: string;
  sectionKey?: string;
}

const sectionMeta: Record<string, { icon: React.ElementType; gradient: string; badge: string }> = {
  featured: { icon: Star, gradient: "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/20", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  most_ordered: { icon: TrendingUp, gradient: "from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  new_arrivals: { icon: Sparkles, gradient: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20", badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  low_budget: { icon: Wallet, gradient: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  sponsors: { icon: Megaphone, gradient: "from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
};

const ProductRow = ({ title, products, linkPrefix = "/product/", sectionKey }: ProductRowProps) => {
  const navigate = useNavigate();
  const meta = sectionKey ? sectionMeta[sectionKey] : null;
  const Icon = meta?.icon;
  const { cardWidth, gap, sectionPadding, rowClasses, imgLoading } = useGridClasses();

  // Sort: available first, coming_soon last
  const sortedProducts = [...products].sort((a, b) => {
    if (a.coming_soon && !b.coming_soon) return 1;
    if (!a.coming_soon && b.coming_soon) return -1;
    return 0;
  });

  return (
    <section className={`${sectionPadding} ${meta ? `bg-gradient-to-r ${meta.gradient}` : "bg-card"}`}>
      <div className="container">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className={`flex items-center justify-center rounded-lg p-1.5 ${meta!.badge}`}>
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h2 className="font-heading text-lg font-bold text-foreground md:text-xl">{title}</h2>
          </div>
          <button
            onClick={() => navigate(`/category/${encodeURIComponent(title)}`)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            View All
          </button>
        </div>

        <div className={`grid grid-flow-col ${rowClasses} ${gap} overflow-x-auto scrollbar-hide pb-2`}>
          {sortedProducts.map((p, i) => (
            <div
              key={p.id || i}
              onClick={() => p.id && !p.coming_soon && navigate(`${linkPrefix}${p.id}`)}
              className={`group flex ${cardWidth} shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-lg ${p.coming_soon ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  loading={imgLoading}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                {p.coming_soon ? (
                  <span className="absolute left-0 right-0 top-0 flex items-center justify-center gap-1 bg-foreground/70 py-1 text-[10px] font-bold text-background">
                    <Clock className="h-3 w-3" /> Coming Soon
                  </span>
                ) : p.originalPrice ? (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                    {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF
                  </span>
                ) : null}
                {!p.coming_soon && p.wallet_points && p.wallet_points > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <Coins className="h-3 w-3" /> Earn {p.wallet_points} pts
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <span className="line-clamp-2 text-xs font-medium text-foreground">{p.name}</span>
                {!p.coming_soon && (
                  <>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-[11px] text-muted-foreground">{p.rating}</span>
                    </div>
                    <div className="mt-auto flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-foreground">₹{p.price}</span>
                      {p.originalPrice && (
                        <span className="text-[11px] text-muted-foreground line-through">₹{p.originalPrice}</span>
                      )}
                    </div>
                  </>
                )}
                {p.coming_soon && (
                  <p className="mt-auto text-[11px] font-semibold text-muted-foreground">Launching soon</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductRow;

