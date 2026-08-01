import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DailyBarChart from './DailyBarChart';

interface OverviewResponse {
  days: number;
  recipesPerDay: { date: string; count: number }[];
  aiUsagePerDay: { date: string; totalTokens: number; costUsd: number; callCount: number }[];
  totals: { recipes: number; totalTokens: number; costUsd: number; callCount: number };
}

interface AdminRecipe {
  id: string;
  title: string;
  createdAt: string;
  creator: { platform: string; handle: string; displayName: string | null } | null;
  createdByEmail: string | null;
}

interface RecipesResponse {
  page: number;
  pageSize: number;
  total: number;
  recipes: AdminRecipe[];
}

const PERIOD_DAYS = 30;
const PAGE_SIZE = 20;

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat('fr-FR');

const AdminDashboard = () => {
  const [page, setPage] = useState(1);

  const { data: overview } = useQuery<OverviewResponse>({
    queryKey: ['admin', 'overview', PERIOD_DAYS],
    queryFn: async () => {
      const res = await authFetch(`/api/admin/overview?days=${PERIOD_DAYS}`);
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
  });

  const { data: recipesPage } = useQuery<RecipesResponse>({
    queryKey: ['admin', 'recipes', page],
    queryFn: async () => {
      const res = await authFetch(`/api/admin/recipes?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
  });

  const totalPages = recipesPage ? Math.max(1, Math.ceil(recipesPage.total / PAGE_SIZE)) : 1;

  return (
    <div className="container mx-auto p-6 md:p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-semibold mb-1">Administration</h1>
      <p className="text-muted-foreground mb-8">
        Recettes créées et consommation IA sur les {PERIOD_DAYS} derniers jours.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recettes créées</CardDescription>
            <CardTitle>{overview ? numberFormatter.format(overview.totals.recipes) : '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Appels IA</CardDescription>
            <CardTitle>{overview ? numberFormatter.format(overview.totals.callCount) : '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens IA</CardDescription>
            <CardTitle>{overview ? numberFormatter.format(overview.totals.totalTokens) : '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Coût IA estimé</CardDescription>
            <CardTitle>{overview ? currencyFormatter.format(overview.totals.costUsd) : '—'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recettes créées / jour</CardTitle>
          </CardHeader>
          <CardContent>
            {overview && (
              <DailyBarChart
                data={overview.recipesPerDay.map((d) => ({ date: d.date, value: d.count }))}
                colorClass="bg-primary"
                formatValue={(v) => `${numberFormatter.format(v)} recette${v === 1 ? '' : 's'}`}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tokens IA / jour</CardTitle>
            <CardDescription>
              Coût estimé — tarifs de gpt-5.6-luna et gpt-image-2 à confirmer dans server/lib/aiPricing.ts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview && (
              <DailyBarChart
                data={overview.aiUsagePerDay.map((d) => ({ date: d.date, value: d.totalTokens }))}
                colorClass="bg-secondary"
                formatValue={(v) => `${numberFormatter.format(v)} tokens`}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dernières recettes importées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">Titre</th>
                  <th className="py-2 pr-4">Créateur</th>
                  <th className="py-2 pr-4">Importé par</th>
                  <th className="py-2 pr-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {recipesPage?.recipes.map((recipe) => (
                  <tr key={recipe.id} className="border-b border-border/50">
                    <td className="py-2 pr-4">{recipe.title}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {recipe.creator ? `@${recipe.creator.handle}` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {recipe.createdByEmail ?? 'Anonyme / inconnu'}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(recipe.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {recipesPage ? `${recipesPage.total} recette${recipesPage.total === 1 ? '' : 's'} au total` : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
