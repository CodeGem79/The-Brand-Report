import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchBlogArticle } from "@/lib/data";

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>(); // Get the article ID from the URL
  const navigate = useNavigate();
  
  // Fetch single article using the ID
  const { data: article, isLoading } = useQuery({
    queryKey: ['blogArticle', id],
    queryFn: () => (id ? fetchBlogArticle(id) : Promise.resolve(undefined)),
    enabled: !!id, // Only run the query if a valid ID exists
  });

  // --- Display Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 max-w-4xl">
          {/* Loading Skeletons to show the user the page is busy */}
          <div className="h-6 w-32 bg-muted rounded-md mb-6" />
          <div className="aspect-video w-full bg-muted rounded-lg mb-8" />
          <div className="h-4 w-48 bg-muted rounded-md mb-4" />
          <div className="h-10 w-full bg-muted rounded-lg mb-4" />
          <div className="h-4 w-full bg-muted rounded-md mb-8" />
          <div className="h-4 w-5/6 bg-muted rounded-md mb-4" />
          <div className="h-4 w-full bg-muted rounded-md mb-4" />
          <div className="h-4 w-1/2 bg-muted rounded-md" />
        </main>
      </div>
    );
  }
  
  // --- Handle Not Found ---
  if (!id || !article) {
    // Redirect to the blog index if the article is not found or ID is missing
    return <Navigate to="/blog" replace />; 
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/blog')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Button>

        <article>
          <div className="aspect-video overflow-hidden rounded-lg mb-8">
            <img 
              src={article.image || "/placeholder.svg"} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Badge>{article.category}</Badge>
            {article.featured && <Badge variant="destructive">Featured</Badge>}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none dark:prose-invert">
            {/* Simple Markdown rendering based on paragraph breaks */}
            {article.content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{paragraph.slice(2)}</h1>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{paragraph.slice(3)}</h2>;
              }
              if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                return (
                  <ul key={index} className="list-disc list-inside space-y-2 my-4">
                    {items.map((item, i) => (
                      <li key={i}>{item.slice(2)}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={index} className="mb-4 leading-relaxed">{paragraph}</p>;
            })}
          </div>
        </article>
      </main>
    </div>
  );
}