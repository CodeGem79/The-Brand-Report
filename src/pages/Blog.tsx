import { Header } from "@/components/Header";
import { BlogCard } from "@/components/BlogCard";
import { mockBlogArticles } from "@/data/mockData";
import { BookOpen } from "lucide-react";

export default function Blog() {
  const featuredArticles = mockBlogArticles.filter(article => article.featured);
  const regularArticles = mockBlogArticles.filter(article => !article.featured);

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
      </main>
    </div>
  );
}
