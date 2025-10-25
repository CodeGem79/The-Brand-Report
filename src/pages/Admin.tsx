import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, BookOpen, BarChart3, FileText, TrendingUp, Lock, Pencil, Trash2, Save, Eye, Search, Users, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"; 

import { useQueryClient } from "@tanstack/react-query";

// Import Firebase dependencies
import { collection, addDoc, serverTimestamp, DocumentData } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
// [MODIFIED] Import Firebase Functions SDK and instance
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from "@/lib/firebase"; 
import { Petition } from "@/data/mockData"; 

// Import centralized data access functions
import { fetchPetitions, fetchIncidentReports, fetchBlogArticles, deleteDocument, updateDocument, linkReportToPetition, unlinkClaimantFromPetition, addTimelineUpdate } from "@/lib/data";
// Import CSV export utility
import { exportToCsv } from "@/lib/utils";

// --- CLOUD FUNCTION CALLERS ---
// These functions will execute the save on the server side
const callAdminUpdate = httpsCallable(functions, 'updateAdminDocument');
const callTimelineLog = httpsCallable(functions, 'addTimelineLog');


// Type for Incident Report (Must be defined here for the component)
interface IncidentReport {
  id: string;
  name: string;
  email: string;
  phone?: string;
  brandName: string;
  category: string;
  amount: number | null;
  issueDescription: string;
  desiredOutcome: string;
  status: string;
  verification_level: string;
  submittedAt: string;
  petitionId?: string;
}

// Type for the data being edited
type EditableItem = Petition | { id: string; title: string; excerpt: string; content: string; category: string; featured: boolean; image: string };


// --- CLAIMANT LIST MODAL COMPONENT (View/Remove Supporters) ---
const ClaimantListModal = ({
    petition,
    isOpen,
    onClose,
    onRemoveClaimant,
}: {
    petition: Petition | null;
    isOpen: boolean;
    onClose: () => void;
    onRemoveClaimant: (petitionId: string, claimantComment: any, reportId: string) => Promise<void>;
}) => {
    if (!petition) return null;
    
    // Filter comments to show only the verified claimants
    const claimants = petition.comments.filter(c => c.isClaimant);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async (claimantComment: any, reportId: string) => {
        if (window.confirm(`Are you sure you want to remove this claimant and delete the source Incident Report ID: ${reportId}? This will decrement the supporter count.`)) {
            setIsRemoving(true);
            try {
                await onRemoveClaimant(petition.id, claimantComment, reportId);
            } catch (e) {
                console.error("Error removing claimant:", e);
            } finally {
                setIsRemoving(false);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Verified Claimants for: {petition.brand} - {petition.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Total Verified Claimants: **{claimants.length}** (Reports that contributed to the supporter count)
                    </p>
                </DialogHeader>
                <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead className="w-[150px]">Claimant Name</TableHead>
                                <TableHead>Email Address</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {claimants.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No verified claimants linked yet.</TableCell></TableRow>
                            ) : (
                                claimants.map((claimant) => (
                                    <TableRow key={claimant.id}>
                                        <TableCell>{new Date(claimant.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium text-sm">{claimant.claimantName || 'N/A'}</TableCell>
                                        <TableCell className="text-sm break-words max-w-xs">{claimant.claimantEmail || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                disabled={isRemoving}
                                                onClick={() => handleRemove(claimant, claimant.id)} 
                                            >
                                                {isRemoving ? 'Removing...' : 'Remove'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- REPORT DETAIL MODAL COMPONENT (UNCHANGED) ---
const ReportDetailModal = ({
  report,
  isOpen,
  onClose,
  onDelete,
  petitionsList,
  onLinkReport,
}: {
  report: IncidentReport | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (collectionName: string, id: string) => Promise<void>;
  petitionsList: Petition[]; 
  onLinkReport: (reportId: string, petitionId: string, reportData: IncidentReport) => Promise<void>; 
}) => {
  if (!report) return null;

  const [selectedPetitionId, setSelectedPetitionId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  
  // Look up the linked petition details using the petitionId stored on the report
  const linkedPetition = report.petitionId 
      ? petitionsList.find(p => p.id === report.petitionId)
      : null;

  const handleDeleteClick = () => {
    onDelete('incident_reports', report.id);
    onClose();
  };
  
  const handleLinkClick = async () => {
      if (!selectedPetitionId) return;

      setIsLinking(true);
      try {
          await onLinkReport(report.id, selectedPetitionId, report);
          setSelectedPetitionId(''); 
      } catch (error) {
          console.error("Linking failed: ", error);
      } finally {
          setIsLinking(false);
          onClose();
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Incident Report Details</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Filed on: {new Date(report.submittedAt).toLocaleDateString()}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Defensively check brandName */}
          <p className="text-lg font-semibold">{report.brandName || 'Unspecified Brand'}</p>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Category:</div>
            <div className="text-muted-foreground">{report.category?.replace("-", " ") || 'N/A'}</div>
            
            <div className="font-medium">Amount:</div>
            <div className="text-muted-foreground">
                {report.amount ? `£${report.amount.toFixed(2)}` : "N/A"}
            </div>
            
            <div className="font-medium">Name:</div>
            <div className="text-muted-foreground">{report.name || 'Anonymous'}</div>
            
            {/* FIX: Ensure email is handled safely (CRITICAL FIX) */}
            <div className="font-medium">Email:</div>
            <div className="text-muted-foreground break-all">{report.email || 'N/A'}</div> 
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-base">Issue Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.issueDescription || "No description provided."}
            </p>
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-base">Desired Outcome</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.desiredOutcome || "N/A"}
            </p>
          </div>
        </div>
        
        {/* ACTION BLOCK */}
        {report.status !== 'Linked' && (
        <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-base">Action: Link Report to Investigation</h4>
            <div className="space-y-2">
                <Label htmlFor="petition-select">Select Target Investigation</Label>
                <Select value={selectedPetitionId} onValueChange={setSelectedPetitionId}>
                    <SelectTrigger id="petition-select">
                        <SelectValue placeholder="Choose an active investigation..." />
                    </SelectTrigger>
                    <SelectContent>
                        {petitionsList.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.brand} - {p.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button 
                className="w-full"
                onClick={handleLinkClick}
                disabled={!selectedPetitionId || isLinking}
            >
                {isLinking ? "Linking..." : "Link Report & Add 1 Supporter"}
            </Button>
        </div>
        )}
        {report.status === 'Linked' && (
          <Alert variant="default" className="bg-green-500/10 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Report is already **Linked** to: <strong>{linkedPetition ? `${linkedPetition.brand} - ${linkedPetition.title}` : `ID: ${report.petitionId}`}</strong>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          <Button variant="destructive" onClick={handleDeleteClick}>
            <Trash2 className="w-4 h-4 mr-2" />
            {report.status === 'Linked' ? 'Remove Link & Delete Report' : 'Archive / Delete Report'}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- EDIT MODAL COMPONENT (Used for Petitions and Blogs) ---
const EditModal = ({
  item,
  collectionName,
  isOpen,
  onClose,
  onSave,
}: {
  item: EditableItem | null;
  collectionName: 'petitions' | 'blog_articles';
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}) => {
  const isPetition = collectionName === 'petitions';
  
  const [editData, setEditData] = useState(item);

  useEffect(() => {
    if(item) {
        setEditData(JSON.parse(JSON.stringify(item)));
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditData(prev => (prev ? { ...prev, [id]: value } : null));
  };

  const handleSelectChange = (id: string, value: string | boolean) => {
    setEditData(prev => (prev ? { ...prev, [id]: value } : null));
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(editData) {
        // CALLS handleUpdate in the parent component
        await onSave(editData.id, editData);
    }
    onClose();
  };

  if (!item || !editData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit {isPetition ? 'Investigation' : 'Blog Article'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* General Fields */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={editData.title} onChange={handleChange} required />
          </div>
          
          {isPetition && (
            <>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" value={(editData as Petition).brand} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={(editData as Petition).description} onChange={handleChange} rows={3} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={(editData as Petition).status}
                  onValueChange={(value) => handleSelectChange('status', value as Petition['status'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Under Observation</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blogContent">Detail Content</Label>
                <Textarea id="blogContent" value={(editData as Petition).blogContent} onChange={handleChange} rows={10} required />
              </div>
            </>
          )}

          {!isPetition && (
            <>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea id="excerpt" value={(editData as EditableItem & { excerpt: string }).excerpt} onChange={handleChange} rows={2} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={(editData as EditableItem & { category: string }).category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consumer Education">Consumer Education</SelectItem>
                    <SelectItem value="Consumer Tips">Consumer Tips</SelectItem>
                    <SelectItem value="Investigations">Investigations</SelectItem>
                    <SelectItem value="Legal Insights">Legal Insights</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image URL / Path</Label>
                <Input id="image" value={(editData as EditableItem & { image: string }).image} onChange={handleChange} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="content">Full Content</Label>
                <Textarea id="content" value={(editData as EditableItem & { content: string }).content} onChange={handleChange} rows={10} required />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={(editData as EditableItem & { featured: boolean }).featured}
                  onChange={(e) => handleSelectChange('featured', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="featured" className="cursor-pointer">Mark as Featured Article</Label>
              </div>
            </>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </DialogClose>
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// --- ADMIN DASHBOARD COMPONENT (Used only when signed in) ---
const AdminDashboard = ({ 
  user, 
  handleSignOut,
  petitions, 
  incidentReports,
  loading,
  getStatusColor,
  getStatusLabel,
  handleSubmit,
  formData,
  setFormData,
  handleBlogSubmit,
  blogFormData,
  setBlogFormData,
  handleDelete,
  handleUpdate,
  blogArticles,
  openEditModal,
  openReportModal,
  openClaimantModal, // Prop to open the claimant list
}: {
  user: User | null;
  handleSignOut: () => void;
  petitions: Petition[];
  incidentReports: IncidentReport[];
  loading: boolean;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  formData: any;
  setFormData: (data: any) => void;
  handleBlogSubmit: (e: React.FormEvent) => Promise<void>;
  blogFormData: any;
  setBlogFormData: (data: any) => void;
  handleDelete: (collectionName: string, id: string) => Promise<void>;
  handleUpdate: (collectionName: 'petitions' | 'blog_articles', updatedData: EditableItem) => Promise<void>;
  blogArticles: EditableItem[];
  openEditModal: (collectionName: 'petitions' | 'blog_articles', item: EditableItem) => void;
  openReportModal: (report: IncidentReport) => void;
  openClaimantModal: (petition: Petition) => void;
}) => {
  
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportGroupField, setReportGroupField] = useState('brandName'); 

  // Filter reports to only show 'New' reports for triage
  const activeTriageReports = useMemo(() => {
    // Only reports that are NOT linked should be in the triage view
    return incidentReports.filter(r => r.status !== 'Linked');
  }, [incidentReports]);
  
  // Grouping logic uses the actively filtered reports
  const groupedReports = useMemo(() => {
    const query = reportSearchQuery.toLowerCase().trim();
    
    // 1. Filter reports based on search query
    const filtered = activeTriageReports.filter(report => 
      report.brandName?.toLowerCase().includes(query) || 
      report.category?.toLowerCase().includes(query) ||
      report.issueDescription?.toLowerCase().includes(query)
    );

    // 2. Group reports
    const groups: { [key: string]: { count: number; items: IncidentReport[] } } = {};

    filtered.forEach(report => {
      const groupKey = (report[reportGroupField as keyof IncidentReport] as string || 'Unspecified').trim();
      
      if (!groups[groupKey]) {
        groups[groupKey] = { count: 0, items: [] };
      }
      groups[groupKey].count++;
      groups[groupKey].items.push(report);
    });

    return Object.keys(groups).sort().map(key => ({
      groupName: key,
      ...groups[key]
    }));
  }, [activeTriageReports, reportSearchQuery, reportGroupField]);
  
  
  const handleExport = () => {
      if (incidentReports.length === 0) {
          return;
      }
      exportToCsv(incidentReports, "TBR_All_Incident_Reports");
      toast({
          title: "Export Started",
          description: "Downloading all incident reports as CSV.",
      });
  };


  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
      </div>

      <Alert className="mb-6 border-accent/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Admin Logged In:</strong> You have full write access to Petitions and Blog Articles.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="blog">Blog Articles</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB - Summary, Investigations Overview, Recent Reports */}
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
          
          {/* Investigations Overview (Existing) */}
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
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                            {/* Supporter count is now clickable to open the claimant list */}
                            <span 
                                onClick={() => openClaimantModal(petition)} 
                                className="cursor-pointer hover:text-accent font-bold underline underline-offset-2"
                            >
                                {petition.supporters}
                            </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditModal('petitions', petition)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDelete('petitions', petition.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Grouped Intelligence Reports - NEW FEATURE (Filtered for Triage) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Intelligence Report Triage (New/Unlinked: {activeTriageReports.length})</CardTitle>
                <CardDescription>Group reports by brand or category for action.</CardDescription>
              </div>
              <Button 
                onClick={handleExport}
                variant="secondary" 
                size="sm"
                disabled={incidentReports.length === 0}
              >
                Export All ({incidentReports.length})
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Filter and Group Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search reports by brand or issue description..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={reportGroupField} onValueChange={setReportGroupField} className="w-full sm:w-[200px]">
                  <SelectTrigger>
                    <SelectValue placeholder="Group by Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brandName">Group by Brand</SelectItem>
                    <SelectItem value="category">Group by Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading latest reports...</div>
              ) : groupedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTriageReports.length === 0 ? "No new reports requiring triage." : "No reports matched your filter."}
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {groupedReports.map(group => (
                    <div key={group.groupName} className="border rounded-lg shadow-sm">
                      <div className="flex items-center justify-between p-3 bg-muted/50">
                        <h3 className="font-semibold text-lg">{group.groupName}</h3>
                        <Badge variant="default" className="text-base">{group.count} Reports</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[120px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map(complaint => (
                            <TableRow key={complaint.id} className={complaint.status === 'Linked' ? 'bg-green-500/10' : ''}>
                              <TableCell>
                                {new Date(complaint.submittedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="truncate max-w-xs text-sm">
                                {complaint.issueDescription?.substring(0, 50)}...
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{complaint.status || 'New'}</Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2"> 
                                  <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => openReportModal(complaint)}
                                  >
                                      <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                      variant="destructive" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={() => handleDelete('incident_reports', complaint.id)}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* INVESTIGATIONS TAB - Create & Manage */}
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
                    <Input id="brand" placeholder="e.g., TechGiant Inc." value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Investigation Title</Label>
                    <Input id="title" placeholder="e.g., The 14-Day Refund: A Brand Wrong" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea id="description" placeholder="Brief summary of the issue (displayed on cards)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Under Observation</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blogContent">Detailed Investigation Content</Label>
                    <Textarea id="blogContent" placeholder="Full investigation details, evidence, demands, etc. (supports Markdown)" value={formData.blogContent} onChange={(e) => setFormData({ ...formData, blogContent: e.target.value })} rows={12} required />
                  </div>
                  <Button type="submit" className="w-full" size="lg">Create Investigation</Button>
               </form>
            </CardContent>
          </Card>

          {/* Existing Investigation List */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Manage Existing Investigations</CardTitle>
              <CardDescription>Quickly edit or delete current watchlist items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {petitions.map((petition) => (
                    <TableRow key={petition.id}>
                      <TableCell className="font-medium">{petition.brand}</TableCell>
                      <TableCell className="truncate max-w-xs">{petition.title}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal('petitions', petition)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDelete('petitions', petition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOG ARTICLES TAB - Create & Manage */}
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
                    <Input id="blogTitle" placeholder="e.g., Understanding Your Consumer Rights" value={blogFormData.title} onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea id="excerpt" placeholder="Brief summary that appears on the blog listing page" value={blogFormData.excerpt} onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })} rows={2} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={blogFormData.category} onValueChange={(value) => setBlogFormData({ ...blogFormData, category: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consumer Education">Consumer Education</SelectItem>
                        <SelectItem value="Consumer Tips">Consumer Tips</SelectItem>
                        <SelectItem value="Investigations">Investigations</SelectItem>
                        <SelectItem value="Legal Insights">Legal Insights</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Image URL / Path</Label>
                    <Input id="image" placeholder="/placeholder.svg or full URL" value={blogFormData.image} onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Article Content</Label>
                    <Textarea id="content" placeholder="Full article content (supports Markdown)" value={blogFormData.content} onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })} rows={16} required />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="featured" checked={blogFormData.featured} onChange={(e) => setBlogFormData({ ...blogFormData, featured: e.target.checked })} className="rounded" />
                    <Label htmlFor="featured" className="cursor-pointer">Mark as Featured Article</Label>
                  </div>
                  <Button type="submit" className="w-full" size="lg">Publish Article</Button>
                </form>
            </CardContent>
          </Card>

          {/* Existing Blog Article List */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Manage Existing Blog Articles</CardTitle>
              <CardDescription>Quickly edit or delete published articles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium truncate max-w-xs">{article.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(article as EditableItem & { category: string }).category}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditModal('blog_articles', article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDelete('blog_articles', article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};


// --- MAIN ADMIN AUTH COMPONENT ---

const Admin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [blogArticles, setBlogArticles] = useState<EditableItem[]>([]); 
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    brand: "", title: "", description: "", status: "active", blogContent: ""
  });
  const [blogFormData, setBlogFormData] = useState({
    title: "", excerpt: "", content: "", category: "Consumer Education", featured: false, image: "/placeholder.svg"
  });

  // State for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [editingCollection, setEditingCollection] = useState<'petitions' | 'blog_articles'>('petitions');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<IncidentReport | null>(null);
  const [isClaimantModalOpen, setIsClaimantModalOpen] = useState(false);
  const [viewingPetition, setViewingPetition] = useState<Petition | null>(null);


  // Helper to open Edit Modal
  const openEditModal = (collectionName: 'petitions' | 'blog_articles', item: EditableItem) => {
    setEditingCollection(collectionName);
    setEditingItem(item);
    setIsModalOpen(true);
  };
  
  // Helper to open Report Detail Modal
  const openReportModal = (report: IncidentReport) => {
    setViewingReport(report);
    setIsReportModalOpen(true);
  };
  
  // Helper to open Claimant List Modal
  const openClaimantModal = (petition: Petition) => {
      setViewingPetition(petition);
      setIsClaimantModalOpen(true);
  };


  // 1. Auth State Listener 
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  const invalidateAllQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['petitions'] });
      queryClient.invalidateQueries({ queryKey: ['blogArticles'] });
      setLoadingAuth(false); 
  };
  
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingData(true);
      try {
        const reportsData = await fetchIncidentReports(); // Fetch all reports
        setIncidentReports(reportsData);
        
        const petitionsData = await fetchPetitions();
        setPetitions(petitionsData);

        const blogArticlesData = await fetchBlogArticles(); 
        setBlogArticles(blogArticlesData as EditableItem[]);
        
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
          title: "Data Fetch Failed",
          description: "Could not connect to the database. Check Firebase config and rules.",
          variant: "destructive"
        });
      } finally {
        setLoadingData(false);
      }
    };
    
    if (!loadingAuth) {
        fetchAllData();
    }
  }, [toast, loadingAuth]);

  // 3. Auth Actions (Sign in/out)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingAuth(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Sign In Successful",
        description: "Welcome back, Admin!",
      });
    } catch (error: any) {
      console.error("Sign In Error: ", error.message);
      toast({
        title: "Sign In Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingAuth(false);
    }
  };
  
  const handleSignOut = async () => {
    await signOut(auth);
    toast({
        title: "Signed Out",
        description: "Admin session ended.",
    });
  };

  // 4. WRITE ACTIONS (Create, Delete, Update, Link, Unlink)
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to create content.", variant: "destructive" });
    
    try {
      await addDoc(collection(db, "petitions"), {
        brand: formData.brand, title: formData.title, description: formData.description,
        supporters: 0, status: formData.status, createdAt: serverTimestamp(),
        blogContent: formData.blogContent, updates: [], comments: [],
      });
      toast({ title: "Investigation Launched!", description: `Brand ${formData.brand} is now on The Watchlist.` });
      setFormData({ brand: "", title: "", description: "", status: "active", blogContent: "" });
      invalidateAllQueries(); 
    } catch (error) {
      console.error("Error creating investigation: ", error);
      toast({ title: "Submission Failed", description: "Could not create the investigation. Check database connection/rules.", variant: "destructive" });
    }
  };

  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to publish an article.", variant: "destructive" });
    
    try {
      await addDoc(collection(db, "blog_articles"), {
        title: blogFormData.title, excerpt: blogFormData.excerpt, content: blogFormData.content,
        author: "The Brand Report Team", publishedAt: serverTimestamp(),
        category: blogFormData.category, featured: blogFormData.featured,
        image: blogFormData.image || "/placeholder.svg" 
      });
      toast({ title: "Article Published!", description: `The article "${blogFormData.title}" is now live.`, });
      setBlogFormData({ title: "", excerpt: "", content: "", category: "Consumer Education", featured: false, image: "/placeholder.svg" });
      invalidateAllQueries(); 
    } catch (error) {
      console.error("Error publishing article: ", error);
      toast({ title: "Publishing Failed", description: "Could not publish the article. Check database connection/rules.", variant: "destructive" });
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to delete content.", variant: "destructive" });
    
    if (window.confirm(`Are you sure you want to delete this document from ${collectionName}? This cannot be undone.`)) {
      try {
        
        // Before deleting a report, check if it's linked to a petition and reverse the link
        if (collectionName === 'incident_reports') {
            const report = incidentReports.find(r => r.id === id);
            if (report?.petitionId) {
                // Find the exact claimant comment object from the Petition to correctly remove it
                const petition = petitions.find(p => p.id === report.petitionId);
                // The claimant comment ID matches the report ID
                const claimantComment = petition?.comments.find(c => c.id === id);

                if (claimantComment) {
                     // Reverse the link (decrement and remove comment) and then delete the report
                    await unlinkClaimantFromPetition(report.petitionId, claimantComment, id);
                    toast({ title: "Report Unlinked & Deleted", description: `Supporter count for ${petition?.brand} updated. Report removed.`, });
                    invalidateAllQueries();
                    return; // Exit here as the transaction handles both deletion and unlinking
                }
            }
        }
        
        // Standard Deletion (Petitions, Blogs, or unlinked Reports)
        await deleteDocument(collectionName, id);
        toast({ title: "Document Deleted", description: `Item successfully removed from ${collectionName}.` });
        invalidateAllQueries(); 
        
        if (collectionName === 'petitions') {
            queryClient.invalidateQueries({ queryKey: ['petition', id] });
        } else if (collectionName === 'blog_articles') {
            queryClient.invalidateQueries({ queryKey: ['blogArticle', id] });
        }

      } catch (error) {
        console.error("Error deleting document: ", error);
        toast({ title: "Deletion Failed", description: "Could not delete document. Check rules.", variant: "destructive" });
      }
    }
  };

  // Handler for deleting from the Claimant Modal (handles the removal and invalidation)
  const handleRemoveClaimant = async (petitionId: string, claimantComment: any, reportId: string) => {
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to remove claimants.", variant: "destructive" });
    
    try {
        await unlinkClaimantFromPetition(petitionId, claimantComment, reportId);
        toast({ title: "Claimant Removed", description: `Claimant removed and associated report deleted.`, });
        invalidateAllQueries();
        
        queryClient.invalidateQueries({ queryKey: ['petition', petitionId] }); 
        
    } catch (error) {
        console.error("Error removing claimant: ", error);
        toast({ title: "Removal Failed", description: "Could not remove claimant. Check rules/transaction.", variant: "destructive" });
    }
  };

  // [MODIFIED] Using Cloud Function to bypass client-side permission denial
  const handleUpdate = async (collectionName: 'petitions' | 'blog_articles', updatedData: EditableItem) => {
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to edit content.", variant: "destructive" });

    try {
      const { id, ...dataToUpdate } = updatedData;
      
      if (collectionName === 'petitions' && 'createdAt' in dataToUpdate) {
          delete dataToUpdate.createdAt;
      }
      if (collectionName === 'blog_articles' && 'publishedAt' in dataToUpdate) {
          delete dataToUpdate.publishedAt;
      }

      // --- CRITICAL SERVERLESS FIX ---
      // 1. Call the secure Cloud Function to execute the document update
      await callAdminUpdate({
          collectionName: collectionName,
          id: id,
          updates: dataToUpdate,
      });
      
      // 2. [NEW FEATURE LOGIC] Check if it was a petition being updated
      if (collectionName === 'petitions') {
        const updateTitle = prompt("Update Saved. Would you like to log this change to the Investigation Timeline? Enter a brief title for the log (e.g., 'Status Changed to Investigating'):");
        
        if (updateTitle) {
            const updateObject = {
                id: Date.now().toString(),
                title: updateTitle,
                content: `Document edited by Admin (${user?.email || 'Admin User'})`,
                date: new Date().toISOString()
            };
            // 3. Call the secure Cloud Function to log the timeline entry
            await callTimelineLog({ petitionId: id, updateObject: updateObject });
        }
      }
      
      toast({ title: "Document Updated", description: `${updatedData.title || (updatedData as Petition).brand} successfully updated.` });
      invalidateAllQueries(); 
      
      if (collectionName === 'petitions') {
          queryClient.invalidateQueries({ queryKey: ['petition', id] });
      } else if (collectionName === 'blog_articles') {
          queryClient.invalidateQueries({ queryKey: ['blogArticle', id] });
      }

    } catch (error) {
      console.error("Error updating document: ", error);
      toast({ title: "Update Failed", description: "Could not update document. Check server logs.", variant: "destructive" });
    }
  };
  
  const handleLinkReport = async (reportId: string, petitionId: string, reportData: IncidentReport) => {
    if (!user) return toast({ title: "Permission Denied", description: "You must be signed in to link reports.", variant: "destructive" });
    
    try {
        await linkReportToPetition(reportId, petitionId, reportData); 
        toast({ title: "Report Linked", description: "Supporter count updated and report archived.", });
        invalidateAllQueries(); 
        
        queryClient.invalidateQueries({ queryKey: ['petition', petitionId] }); 
    } catch (error) {
        console.error("Link Error: ", error);
        toast({ title: "Link Failed", description: "Could not link report. Check transaction/rules.", variant: "destructive" });
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
  
  if (loadingAuth || loadingData) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container py-8 max-w-4xl text-center">
            <p className="text-xl text-muted-foreground">Loading Admin Dashboard...</p>
          </main>
        </div>
      );
  }

  // Display Sign-in Form if user is NOT authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-24 max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-destructive" />
                Admin Access Required
              </CardTitle>
              <CardDescription>Sign in to manage investigations and content.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="admin@brandreport.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loadingAuth}>
                  {loadingAuth ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <div className="p-4 text-xs text-muted-foreground text-center">
                NOTE: You must manually create an Admin user in your Firebase Console $\rightarrow$ Authentication $\rightarrow$ Users tab first.
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Display Dashboard if user IS authenticated
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        {/* Conditional Edit Modal */}
        {editingItem && (
          <EditModal
            item={editingItem}
            collectionName={editingCollection}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}
            onSave={handleUpdate}
          />
        )}
        
        {/* Conditional Report Detail Modal */}
        <ReportDetailModal
            report={viewingReport}
            isOpen={isReportModalOpen}
            onClose={() => {
                setIsReportModalOpen(false);
                setViewingReport(null);
            }}
            onDelete={handleDelete}
            petitionsList={petitions}
            onLinkReport={handleLinkReport}
        />

        {/* Claimant List Modal */}
        {viewingPetition && (
            <ClaimantListModal
                petition={viewingPetition}
                isOpen={isClaimantModalOpen}
                onClose={() => setIsClaimantModalOpen(false)}
                onRemoveClaimant={handleRemoveClaimant}
            />
        )}

        <AdminDashboard 
          user={user}
          handleSignOut={handleSignOut}
          petitions={petitions}
          incidentReports={incidentReports}
          loading={loadingData}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          handleSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          handleBlogSubmit={handleBlogSubmit}
          blogFormData={blogFormData}
          setBlogFormData={setBlogFormData}
          handleDelete={handleDelete}
          handleUpdate={handleUpdate}
          blogArticles={blogArticles}
          openEditModal={openEditModal}
          openReportModal={openReportModal}
          openClaimantModal={openClaimantModal}
        />
      </main>
    </div>
  );
}

export default Admin;