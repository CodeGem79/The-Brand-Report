import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, BookOpen, BarChart3, FileText, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Import Firebase dependencies
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { IncidentReport, Petition } from "@/data/mockData"; // Assuming these types are in mockData.ts

export default function Admin() {
  const { toast } = useToast();
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  // State for creating a new Petition/Investigation
  const [formData, setFormData] = useState({
    brand: "",
    title: "",
    description: "",
    status: "active",
    blogContent: ""
  });

  // State for creating a new Blog Article
  const [blogFormData, setBlogFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Consumer Education",
    featured: false
  });

  // --- DATA FETCHING (READ) LOGIC ---
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // 1. Fetch Incident Reports (Raw Intelligence)
        const reportsQuery = query(
          collection(db, "incident_reports"),
          orderBy("submittedAt", "desc"),
          limit(20) 
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const reportsData = reportsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure timestamp is converted for display
          submittedAt: doc.data().submittedAt?.toDate().toISOString() || new Date().toISOString()
        })) as IncidentReport[];
        setIncidentReports(reportsData);
        
        // 2. Fetch Petitions (Active Investigations)
        const petitionsQuery = query(
          collection(db, "petitions"),
          orderBy("createdAt", "desc")
        );
        const petitionsSnapshot = await getDocs(petitionsQuery);
        const petitionsData = petitionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
        })) as Petition[];
        setPetitions(petitionsData);
        
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
          title: "Data Fetch Failed",
          description: "Could not connect to the live backend. Check Firebase config.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [toast]);

  // --- INVESTIGATION CREATION (WRITE) LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, "petitions"), {
        brand: formData.brand,
        title: formData.title,
        description: formData.description,
        supporters: 0, // Always starts at zero
        status: formData.status, 
        createdAt: serverTimestamp(),
        blogContent: formData.blogContent,
        updates: [], 
        comments: [],
      });
      toast({
        title: "Investigation Launched!",
        description: `Brand ${formData.brand} is now on The Watchlist.`,
      });
      setFormData({
        brand: "", title: "", description: "", status: "active", blogContent: ""
      });
      // Optionally refresh data to show the new petition immediately
      // fetchReports(); 
    } catch (error) {
      console.error("Error creating investigation: ", error);
      toast({
        title: "Submission Failed",
        description: "Could not create the investigation. Check database connection.",
        variant: "destructive"
      });
    }
  };

  // --- BLOG CREATION (WRITE) LOGIC ---
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, "blog_articles"), {
        title: blogFormData.title,
        excerpt: blogFormData.excerpt,
        content: blogFormData.content,
        author: "The Brand Report Team", 
        publishedAt: serverTimestamp(),
        category: blogFormData.category,
        featured: blogFormData.featured,
        image: "/placeholder.svg" 
      });
      toast({
        title: "Article Published!",
        description: `The article "${blogFormData.title}" is now live.`,
      });
      setBlogFormData({
        title: "", excerpt: "", content: "", category: "Consumer Education", featured: false
      });
    } catch (error) {
      console.error("Error publishing article: ", error);
      toast({
        title: "Publishing Failed",
        description: "Could not publish the article. Check database connection.",
        variant: "destructive"
      });
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-accent text-accent-foreground";
      case "investigating": return "bg-secondary text-secondary-foreground";
      case "resolved": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Under Observation";
      case "investigating": return "Investigating";
      case "resolved": return "Resolved";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <Alert className="mb-6 border-accent/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Backend Progress:</strong> Data fetching from Firebase is active. Admin Authentication is the next critical step.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="investigations">Investigations</TabsTrigger>
            <TabsTrigger value="blog">Blog Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Intelligence Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{incidentReports.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filed by consumers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Investigations</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {petitions.filter(p => p.status === 'active' || p.status === 'investigating').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Under review
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Supporters</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {petitions.reduce((sum, p) => sum + p.supporters, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all investigations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Investigations Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Investigations Overview</CardTitle>
                <CardDescription>Current status of all brand investigations</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading investigations...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Investigation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Supporters</TableHead>
                        <TableHead className="text-right">Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {petitions.map((petition) => (
                        <TableRow key={petition.id}>
                          <TableCell className="font-medium">{petition.brand}</TableCell>
                          <TableCell>{petition.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(petition.status)}>
                              {getStatusLabel(petition.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{petition.supporters}</TableCell>
                          <TableCell className="text-right">{petition.comments.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Complaints */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Intelligence Reports</CardTitle>
                <CardDescription>Latest consumer reports submitted for verification</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading latest reports...</div>
                ) : incidentReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No intelligence reports submitted yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidentReports.slice(0, 10).map((complaint) => (
                        <TableRow key={complaint.id}>
                          <TableCell>
                            {new Date(complaint.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{complaint.name}</TableCell>
                          <TableCell>{complaint.brandName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {complaint.category?.replace("-", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {complaint.amount ? `£${complaint.amount.toFixed(2)}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ... Tabs for Investigations and Blog creation below this point ... */}
          <TabsContent value="investigations" className="space-y-6">
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Investigation
            </CardTitle>
            <CardDescription>
              Add a new brand to the watchlist and create a detailed investigation page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand Name</Label>
                <Input
                  id="brand"
                  placeholder="e.g., TechGiant Inc."
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Investigation Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., The 14-Day Refund: A Brand Wrong"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief summary of the issue (displayed on cards)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Under Observation</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blogContent">Detailed Investigation Content</Label>
                <Textarea
                  id="blogContent"
                  placeholder="Full investigation details, evidence, demands, etc. (supports Markdown)"
                  value={formData.blogContent}
                  onChange={(e) => setFormData({ ...formData, blogContent: e.target.value })}
                  rows={12}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                Create Investigation
              </Button>
            </form>
          </CardContent>
        </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Post Update to Existing Investigation</CardTitle>
                <CardDescription>
                  Add progress updates to active investigations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Investigation</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an investigation..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">TechGiant Inc. - 14-Day Refund</SelectItem>
                      <SelectItem value="2">FastShip Logistics - Hidden Subscriptions</SelectItem>
                      <SelectItem value="3">HomeComfort Co. - Warranty Denials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Update Title</Label>
                  <Input placeholder="e.g., Company Responds to Investigation" />
                </div>

                <div className="space-y-2">
                  <Label>Update Content</Label>
                  <Textarea placeholder="Details of this update..." rows={4} />
                </div>

                <Button className="w-full">Post Update</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Create New Blog Article
                </CardTitle>
                <CardDescription>
                  Write and publish articles about consumer rights and investigations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBlogSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="blogTitle">Article Title</Label>
                    <Input
                      id="blogTitle"
                      placeholder="e.g., Understanding Your Consumer Rights"
                      value={blogFormData.title}
                      onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      placeholder="Brief summary that appears on the blog listing page"
                      value={blogFormData.excerpt}
                      onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={blogFormData.category} onValueChange={(value) => setBlogFormData({ ...blogFormData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consumer Education">Consumer Education</SelectItem>
                        <SelectItem value="Consumer Tips">Consumer Tips</SelectItem>
                        <SelectItem value="Investigations">Investigations</SelectItem>
                        <SelectItem value="Legal Insights">Legal Insights</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Article Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Full article content (supports Markdown)"
                      value={blogFormData.content}
                      onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })}
                      rows={16}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={blogFormData.featured}
                      onChange={(e) => setBlogFormData({ ...blogFormData, featured: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">
                      Mark as Featured Article
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Publish Article
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}