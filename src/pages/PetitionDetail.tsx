// src/pages/PetitionDetail.tsx

import { useState, useEffect } from "react"; 
import { useParams, Link, Navigate, useLocation } from "react-router-dom"; 
import { ArrowLeft, TrendingUp, MessageSquare, Clock, CheckCircle2, Trash2, Flag } from "lucide-react"; 
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query"; 
import { fetchPetition, addPublicComment, deleteCommentFromPetition, reportComment, fetchCommentsPaginated } from "@/lib/data"; 
import { onAuthStateChanged, User } from "firebase/auth"; 
import { auth } from "@/lib/firebase"; 
import { Comment } from "@/data/mockData"; 
import { QueryDocumentSnapshot } from "firebase/firestore"; 


export default function PetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation(); 
  
  // To track Admin status for the delete feature
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); 
  const [isReporting, setIsReporting] = useState(false); 
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null); 
  
  // [NEW STATE FOR PAGINATION]
  const [comments, setComments] = useState<Comment[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false); // Loading state for 'Load More'


  // [SCROLL/HIGHLIGHT LOGIC]
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.substring(1);
      const element = document.getElementById(elementId);
      
      if (element) {
        requestAnimationFrame(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
        setHighlightedCommentId(elementId);
      }
    }
  }, [location.hash]); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAdminUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  // Fetch Petition details (title, status, etc.)
  const { data: petition, isLoading } = useQuery({
    queryKey: ['petition', id],
    queryFn: () => (id ? fetchPetition(id) : Promise.resolve(undefined)), 
    enabled: !!id,
  });

  // [NEW FUNCTION] Main Comment Fetcher
  const loadComments = async (startAfterDoc: QueryDocumentSnapshot | null) => {
    // Only proceed if startAfterDoc is null (initial load) OR if we know there are more pages (hasMore)
    if (!id || (!hasMore && startAfterDoc)) return;

    setIsCommentsLoading(true);
    try {
        const result = await fetchCommentsPaginated(id, startAfterDoc);
        
        // 🛑 CRITICAL FIX: Explicitly append to 'prev' only if it's a subsequent page load.
        setComments(prev => {
            if (startAfterDoc) {
                // Subsequent load: Append new comments to the previous state
                return [...prev, ...result.comments];
            } else {
                // Initial load or refresh: Replace with new comments
                return result.comments;
            }
        });
        
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);

    } catch (error) {
        console.error("Error loading additional comments:", error); 
        toast({ title: "Comment Load Failed", description: "Could not load additional comments.", variant: "destructive" });
    } finally {
        setIsCommentsLoading(false);
    }
  };
  
  // [NEW EFFECT] Initial load of comments when Petition data is ready
  useEffect(() => {
    if (petition && id) {
        // Load the first page of comments
        setComments([]); // Reset state for fresh load
        setHasMore(true); // Ensure we attempt a fetch
        loadComments(null);
    }
  }, [petition, id]); 

  
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");

  if (!id || (!isLoading && !petition)) {
    return <Navigate to="/" replace />;
  }

  const handleSupport = () => {
    toast({
      title: "Support Feature Disabled",
      description: "Support is counted only when a verified report is submitted and linked by our Admin team.",
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentText.trim()) return;
    if (!id) return;

    setIsPostingComment(true);
    try {
        await addPublicComment(id, commentName.trim(), commentText.trim());
        
        toast({
            title: "Comment Submitted",
            description: "Thank you for sharing your experience. Your comment is now live.",
        });
        
        // After posting, reload the entire comment list to show the new comment at the top
        loadComments(null); 
        
        setCommentName("");
        setCommentText("");
    } catch (error) {
        console.error("Error posting comment:", error);
        toast({
            title: "Submission Failed",
            description: "Could not post comment. Check database connection or rules.",
            variant: "destructive"
        });
    } finally {
        setIsPostingComment(false);
    }
  };
  
  const handleDeleteComment = async (comment: Comment) => {
      if (!id || !window.confirm(`Are you sure you want to delete this comment by ${comment.author}? This action is permanent.`)) {
          return;
      }
      
      setIsDeleting(true);
      try {
          // Deletes the subcollection document
          await deleteCommentFromPetition(id, comment); 
          
          toast({
              title: "Comment Deleted",
              description: "The comment has been successfully removed.",
          });
          
          // Reload comments from the beginning to show the updated list
          loadComments(null); 
          
      } catch (error) {
          console.error("Error deleting comment:", error);
          toast({
              title: "Deletion Failed",
              description: "Failed to delete comment. Check Admin login status and Firestore rules.",
              variant: "destructive"
          });
      } finally {
          setIsDeleting(false);
      }
  }

  const handleReportComment = async (comment: Comment) => {
    if (!id) return;
    
    // Simple prompt dialog to get report info from public user
    const reporterName = prompt("Enter your name (optional) to submit the report:");
    if (reporterName === null) return; 

    const reason = prompt(`Why are you reporting this comment by ${comment.author}? (e.g., 'Abusive', 'Spam', 'Hate Speech')`);
    if (!reason || !reason.trim()) {
        return toast({ title: "Report Canceled", description: "A reason is required to submit a report." });
    }

    // CRITICAL DIAGNOSTIC LOG 
    console.log("Reporting Payload:");
    console.log("Comment ID BEING SENT:", comment.id); 
    console.log("-----------------------");
    
    setIsReporting(true);
    try {
        await reportComment(
            id, 
            comment.id, 
            reporterName || "Anonymous User", 
            reason.trim()
        );

        toast({
            title: "Comment Reported",
            description: "Thank you. This comment has been flagged for Admin review.",
        });
    } catch (error) {
        console.error("Error reporting comment:", error);
        toast({
            title: "Report Failed",
            description: "Could not submit report. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsReporting(false);
    }
  }

  const statusColors = {
    active: "bg-accent text-accent-foreground",
    investigating: "bg-secondary text-secondary-foreground",
    resolved: "bg-muted text-muted-foreground"
  };

  const statusLabels = {
    active: "Under Observation",
    investigating: "Investigating",
    resolved: "Resolved"
  };

  // Display Loading State for main data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 max-w-4xl">
           <div className="flex flex-col gap-4">
              <div className="h-6 w-32 bg-muted rounded-md mb-6" />
              <div className="h-10 w-full bg-muted rounded-lg" />
              <div className="h-6 w-1/2 bg-muted rounded-md" />
              <div className="h-40 w-full bg-muted rounded-lg mt-8" />
              <div className="h-6 w-full bg-muted rounded-lg mt-8" />
              <div className="h-4 w-full bg-muted rounded-md" />
              <div className="h-4 w-3/4 bg-muted rounded-md" />
           </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Investigations
        </Link>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4">
            <Badge className={statusColors[petition.status]}>
              {statusLabels[petition.status]}
            </Badge>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Opened {new Date(petition.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{petition.brand}</h1>
          <p className="text-lg sm:text-xl text-muted-foreground">{petition.title}</p>
        </div>

        {/* Support & Stats */}
        <Card className="mb-8 border-accent/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                {/* Supporter Count is now strictly from the DB */}
                <div className="text-3xl font-bold text-accent mb-1">
                  {petition.supporters.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Verified Claimants</div>
              </div>
              <div className="text-center">
                {/* 🛑 MODIFIED: Comment count is now based on the fetched comments state */}
                <div className="text-3xl font-bold mb-1">{comments.length}</div>
                <div className="text-sm text-muted-foreground">Comments Shown</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{petition.updates.length}</div>
                <div className="text-sm text-muted-foreground">Updates</div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            {/* The button is now a purely informational placeholder */}
            <Button 
              onClick={handleSupport} 
              variant="outline"
              className="w-full gap-2 text-sm"
              size="lg"
            >
              Support is counted by verified Incident Reports.
            </Button>
          </CardContent>
        </Card>

        {/* Blog Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Investigation Details</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {petition.blogContent}
            </div>
          </CardContent>
        </Card>

        {/* Updates Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Investigation Timeline
            </CardTitle>
            <CardDescription>Updates and progress on this case</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {petition.updates.map((update, index) => (
                <div key={update.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    </div>
                    {index < petition.updates.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(update.date).toLocaleDateString()}
                    </div>
                    <h4 className="font-semibold mb-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground">{update.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Community Comments
            </CardTitle>
            <CardDescription>Share your experience or support</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleComment} className="space-y-4 mb-6">
              <Input
                placeholder="Your name"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                required
              />
              <Textarea
                placeholder="Share your experience or comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                required
              />
              <Button type="submit" className="w-full" disabled={isPostingComment}>
                {isPostingComment ? "Posting..." : "Post Comment"}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-6">
              {/* 🛑 MODIFIED: Rendering from local 'comments' state */}
              {comments.map((comment) => {
                // Check highlight status directly against the URL hash on every render.
                const isReported = `#${comment.id}` === location.hash; 

                return (
                  <div 
                    key={comment.id} 
                    id={comment.id} // [CRITICAL FIX] Add ID for deep linking/scrolling
                    // [FINAL FIX: USE INLINE STYLE] Uses a fixed yellow background for maximum visibility
                    style={isReported ? { backgroundColor: '#FFFAE8', border: '2px solid #FFC107', borderRadius: '8px' } : {}}
                    className={`space-y-2 p-3 -m-3 transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {comment.author}
                        
                        {comment.isClaimant && (
                            <Badge 
                                variant="secondary" 
                                className="ml-2 bg-accent/10 text-accent-foreground text-xs font-normal hover:bg-accent/10" 
                            >
                                Verified Report
                            </Badge>
                        )}
                        {isReported && (
                            <Badge variant="destructive" className="ml-2 bg-red-600/90 text-white text-xs font-bold">
                                REPORTED!
                            </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                        <p className={`text-sm ${comment.isClaimant ? 'text-foreground font-mono' : 'text-muted-foreground'}`}>
                            {comment.content}
                        </p>
                        
                        <div className="flex items-center space-x-2">
                            {/* [NEW PUBLIC REPORT BUTTON] */}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-6 h-6 text-muted-foreground/50 hover:text-red-500"
                                onClick={() => handleReportComment(comment)}
                                disabled={isReporting}
                            >
                                <Flag className="w-4 h-4" />
                            </Button>
                            
                            {/* Admin Delete Button (for already implemented feature) */}
                            {adminUser && !comment.isClaimant && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-6 h-6 text-destructive/70 hover:text-destructive"
                                    onClick={() => handleDeleteComment(comment)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                            {/* Admin Delete Disabled for Verified Claimants */}
                            {adminUser && comment.isClaimant && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs w-auto h-6 text-muted-foreground/50 hover:text-muted-foreground/70"
                                    disabled
                                >
                                    Admin Delete Disabled
                                </Button>
                            )}
                        </div>

                    </div>
                    <Separator />
                  </div>
                );
              })}
              
              {/* [NEW UI] Load More Button */}
              {hasMore && (
                  <div className="text-center pt-4">
                      <Button 
                          onClick={() => loadComments(lastVisible)}
                          disabled={isCommentsLoading}
                          variant="outline"
                      >
                          {isCommentsLoading ? "Loading..." : "Load More Comments"}
                      </Button>
                  </div>
              )}
              {/* Show message if all comments loaded */}
              {!hasMore && comments.length > 0 && (
                  <div className="text-center text-sm text-muted-foreground pt-4">
                      All {comments.length} comments loaded.
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}