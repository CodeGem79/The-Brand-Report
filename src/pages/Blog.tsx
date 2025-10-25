// src/pages/Blog.tsx

import { Header } from "@/components/Header";
import { BlogCard } from "@/components/BlogCard";
// import { mockBlogArticles } from "@/data/mockData"; // [DELETED] Remove mock data import
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query"; // [NEW] Import useQuery
import { fetchBlogArticles } from "@/lib/data"; // [NEW] Import fetching function
import { Skeleton } from "@/components/ui/skeleton"; // [NEW] Import Skeleton

export default function Blog() {
  // [NEW] Fetch blog articles
  const { data: blogArticles, isLoading } = useQuery({
    queryKey: ['blogArticles'],
    queryFn: fetchBlogArticles,
  });

  // Use fetched data or an empty array if loading/undefined
  const articles = blogArticles || [];

  // Filtering logic remains the same, now using live data
  const featuredArticles = articles.filter(article => article.featured);
  const regularArticles = articles.filter(article => !article.featured);

  // [NEW] Loading State Component
  const LoadingSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4 overflow-hidden rounded-lg border">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4 text-sm pt-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-3xl mx-auto text-center mb-12 px-4">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Consumer Rights Blog</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Expert insights, guides, and investigations to help you understand and protect your consumer rights.
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeletons /> // Show loading state
        ) : (
          <>
            {featuredArticles.length > 0 && (
              <section className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredArticles.map(article => (
                    <BlogCard key={article.id} {...article} />
                  ))}
                </div>
              </section>
            )}

            {regularArticles.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {regularArticles.map(article => (
                    <BlogCard key={article.id} {...article} />
                  ))}
                </div>
              </section>
            )}

            {articles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No blog articles have been published yet.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}