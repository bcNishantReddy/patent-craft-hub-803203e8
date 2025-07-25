
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { fetchDrafterAssignments, fetchDrafterCompletedAssignments, completeDrafterTask } from '@/lib/api';
import { Patent } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import RefreshButton from '@/components/approvals/RefreshButton';
import LoadingSpinner from '@/components/approvals/LoadingSpinner';
import EmptyApprovals from '@/components/approvals/EmptyApprovals';
import SearchFilters from '@/components/common/SearchFilters';
import PatentResultsCount from '@/components/patents/PatentResultsCount';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertCircle, Clock, Plus } from 'lucide-react';

const ITEMS_PER_PAGE = 6; // Number of items to show per page

const Drafts = () => {
  const navigate = useNavigate();
  const [activePatents, setActivePatents] = useState<Patent[]>([]);
  const [completedPatents, setCompletedPatents] = useState<Patent[]>([]);
  const [filteredActivePatents, setFilteredActivePatents] = useState<Patent[]>([]);
  const [filteredCompletedPatents, setFilteredCompletedPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  React.useEffect(() => {
    if (!user || user.role !== 'drafter') {
      toast.error('Access denied. Drafter privileges required.');
      navigate('/dashboard');
    } else if (!initialLoadComplete) {
      loadPatents();
    }
  }, [user, navigate, initialLoadComplete]);

  const loadPatents = async (isRefresh = false) => {
    if (!user || user.role !== 'drafter') return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [activeData, completedData] = await Promise.all([
        fetchDrafterAssignments(user.full_name),
        fetchDrafterCompletedAssignments(user.full_name)
      ]);
      
      const sortedActivePatents = activeData.sort((a, b) => {
        const getQueueOrder = (patent: Patent) => {
          if (patent.ps_drafter_assgn === user.full_name && patent.ps_drafting_status === 0) {
            return 1;
          } else if (patent.cs_drafter_assgn === user.full_name && patent.cs_drafting_status === 0) {
            return 2;
          } else if (patent.fer_drafter_assgn === user.full_name && patent.fer_drafter_status === 0) {
            return 3;
          }
          return 4;
        };
        
        return getQueueOrder(a) - getQueueOrder(b);
      });
      
      setActivePatents(sortedActivePatents);
      setCompletedPatents(completedData);
      setFilteredActivePatents(sortedActivePatents);
      setFilteredCompletedPatents(completedData);
      setInitialLoadComplete(true);
      
      // Reset to first page when refreshing data
      if (isRefresh) {
        setActivePage(1);
        setCompletedPage(1);
      }
    } catch (error) {
      console.error('Error loading drafter assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Search functionality
  const handleSearch = (query: string, field?: string) => {
    setSearchQuery(query);
    setSearchField(field);
    
    const filterPatents = (patents: Patent[]) => {
      if (!query) return patents;
      
      const lowerQuery = query.toLowerCase();
      
      if (field) {
        switch (field) {
          case 'tracking_id':
            return patents.filter(patent => patent.tracking_id.toLowerCase().includes(lowerQuery));
          case 'client_id':
            return patents.filter(patent => patent.client_id.toLowerCase().includes(lowerQuery));
          case 'patent_title':
            return patents.filter(patent => patent.patent_title.toLowerCase().includes(lowerQuery));
          case 'patent_applicant':
            return patents.filter(patent => patent.patent_applicant.toLowerCase().includes(lowerQuery));
          case 'application_no':
            return patents.filter(patent => patent.application_no?.toLowerCase().includes(lowerQuery));
          default:
            return patents;
        }
      } else {
        return patents.filter(patent =>
          patent.patent_title.toLowerCase().includes(lowerQuery) ||
          patent.tracking_id.toLowerCase().includes(lowerQuery) ||
          patent.patent_applicant.toLowerCase().includes(lowerQuery) ||
          patent.client_id.toLowerCase().includes(lowerQuery) ||
          (patent.application_no && patent.application_no.toLowerCase().includes(lowerQuery))
        );
      }
    };
    
    setFilteredActivePatents(filterPatents(activePatents));
    setFilteredCompletedPatents(filterPatents(completedPatents));
    setActivePage(1);
    setCompletedPage(1);
  };

  const searchFields = [
    { value: 'tracking_id', label: 'Tracking ID' },
    { value: 'client_id', label: 'Client ID' },
    { value: 'patent_title', label: 'Patent Title' },
    { value: 'patent_applicant', label: 'Applicant' },
    { value: 'application_no', label: 'Application No.' },
  ];

  const handleRefresh = () => {
    loadPatents(true);
  };

  const handleComplete = async (patent: Patent) => {
    if (!user) return;
    
    try {
      const success = await completeDrafterTask(patent, user.full_name);
      if (success) {
        toast.success('Drafting task completed and sent for review');
        
        // Update local state to reflect changes without needing to reload
        const updatedPatent = { ...patent };
        
        if (patent.ps_drafter_assgn === user.full_name) {
          updatedPatent.ps_drafting_status = 1;
          updatedPatent.ps_review_draft_status = 1;
        } else if (patent.cs_drafter_assgn === user.full_name) {
          updatedPatent.cs_drafting_status = 1;
          updatedPatent.cs_review_draft_status = 1;
        } else if (patent.fer_drafter_assgn === user.full_name) {
          updatedPatent.fer_drafter_status = 1;
          updatedPatent.fer_review_draft_status = 1;
        }
        
        // Remove from active patents
        const newActivePatents = activePatents.filter(p => p.id !== patent.id);
        setActivePatents(newActivePatents);
        setFilteredActivePatents(newActivePatents);
        
        // Add to completed patents
        const newCompletedPatents = [updatedPatent, ...completedPatents];
        setCompletedPatents(newCompletedPatents);
        setFilteredCompletedPatents(newCompletedPatents);
      }
    } catch (error) {
      console.error('Error completing drafting task:', error);
      toast.error('Failed to complete drafting task');
    }
  };

  const getTaskType = (patent: Patent) => {
    if (patent.ps_drafter_assgn === user?.full_name && patent.ps_drafting_status === 0) {
      return 'Provisional Specification';
    } else if (patent.cs_drafter_assgn === user?.full_name && patent.cs_drafting_status === 0) {
      return 'Complete Specification';
    } else if (patent.fer_drafter_assgn === user?.full_name && patent.fer_drafter_status === 0) {
      return 'First Examination Report';
    }
    return 'Unknown Task';
  };

  const getDeadline = (patent: Patent) => {
    if (patent.ps_drafter_assgn === user?.full_name && patent.ps_drafting_status === 0) {
      return patent.ps_drafter_deadline;
    } else if (patent.cs_drafter_assgn === user?.full_name && patent.cs_drafting_status === 0) {
      return patent.cs_drafter_deadline;
    } else if (patent.fer_drafter_assgn === user?.full_name && patent.fer_drafter_status === 0) {
      return patent.fer_drafter_deadline;
    }
    return null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline set';
    return new Date(dateString).toLocaleDateString();
  };

  const isTaskAvailable = (patent: Patent) => {
    if (patent.ps_drafter_assgn === user?.full_name && patent.ps_drafting_status === 0) {
      return patent.idf_received === true;
    } 
    
    if (patent.cs_drafter_assgn === user?.full_name && patent.cs_drafting_status === 0) {
      return patent.cs_data_received === true && patent.cs_data === true;
    }
    
    if (patent.fer_drafter_assgn === user?.full_name && patent.fer_drafter_status === 0) {
      const psCompleted = !patent.ps_drafter_assgn || patent.ps_drafting_status === 1;
      const csCompleted = !patent.cs_drafter_assgn || patent.cs_drafting_status === 1;
      return psCompleted && csCompleted;
    }
    
    return false;
  };

  const getTaskBlockedReason = (patent: Patent) => {
    if (patent.ps_drafter_assgn === user?.full_name && patent.ps_drafting_status === 0) {
      if (!patent.idf_received) {
        return 'Waiting for IDF to be received';
      }
    }
    
    if (patent.cs_drafter_assgn === user?.full_name && patent.cs_drafting_status === 0) {
      if (!patent.cs_data_received || !patent.cs_data) {
        return 'Waiting for CS data to be received';
      }
    }
    
    if (patent.fer_drafter_assgn === user?.full_name && patent.fer_drafter_status === 0) {
      if (patent.ps_drafter_assgn && patent.ps_drafting_status === 0) {
        return 'Waiting for PS drafting to be completed';
      }
      if (patent.cs_drafter_assgn && patent.cs_drafting_status === 0) {
        return 'Waiting for CS drafting to be completed';
      }
    }
    
    return 'Waiting for prerequisites to be met';
  };

  // Pagination logic
  const paginateData = (data: Patent[], pageNumber: number) => {
    const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const activePatentsPaginated = paginateData(filteredActivePatents, activePage);
  const completedPatentsPaginated = paginateData(filteredCompletedPatents, completedPage);
  
  const renderPagination = (data: Patent[], currentPage: number, setPage: React.Dispatch<React.SetStateAction<number>>) => {
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) return null;
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i} className={isMobile && totalPages > 5 && ![0, 1, totalPages - 2, totalPages - 1].includes(i) && i !== currentPage - 1 ? "hidden" : ""}>
              <PaginationLink
                onClick={() => setPage(i + 1)}
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
        <h1 className="text-2xl font-bold">Drafting Assignments</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/patents/add')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Patent
          </Button>
          <RefreshButton onRefresh={handleRefresh} loading={refreshing} />
        </div>
      </div>

      <div className="mb-4">
        <SearchFilters 
          onSearch={handleSearch}
          placeholder="Search patents..."
          searchFields={searchFields}
        />
      </div>

      <PatentResultsCount
        filteredCount={searchQuery ? filteredActivePatents.length + filteredCompletedPatents.length : activePatents.length + completedPatents.length}
        totalCount={activePatents.length + completedPatents.length}
        searchQuery={searchQuery}
        hasActiveFilters={!!searchQuery}
      />
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto justify-start overflow-x-auto">
          <TabsTrigger value="active">Active Tasks ({filteredActivePatents.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed Tasks ({filteredCompletedPatents.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="min-h-[50vh]">
          {loading ? (
            <LoadingSpinner />
          ) : filteredActivePatents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePatentsPaginated.map(patent => (
                  <Card key={patent.id} className="hover:shadow-md transition-shadow flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-start">
                        <div className="truncate">{patent.patent_title}</div>
                        <StatusBadge status={isTaskAvailable(patent) ? 'active' : 'pending'} />
                      </CardTitle>
                      <CardDescription>ID: {patent.tracking_id}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                      <div className="space-y-2 text-sm flex-grow">
                        <div><span className="font-medium">Applicant:</span> {patent.patent_applicant}</div>
                        <div><span className="font-medium">Task:</span> {getTaskType(patent)}</div>
                        <div><span className="font-medium">Client ID:</span> {patent.client_id}</div>
                        <div><span className="font-medium">Deadline:</span> {formatDate(getDeadline(patent))}</div>
                        
                        {/* IDF status for PS drafters */}
                        {patent.ps_drafter_assgn === user?.full_name && (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">IDF Status:</span>
                            {patent.idf_received ? (
                              <span className="text-green-500">Received ✓</span>
                            ) : (
                              <span className="text-amber-500">Not Received</span>
                            )}
                          </div>
                        )}
                        
                        {/* CS data status for CS drafters */}
                        {patent.cs_drafter_assgn === user?.full_name && (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-medium">CS Data Status:</span>
                            {patent.cs_data_received && patent.cs_data ? (
                              <span className="text-green-500">Received ✓</span>
                            ) : (
                              <span className="text-amber-500">Not Received</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-4 mt-auto flex flex-col sm:flex-row justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/patents/${patent.id}`)}
                          className="w-full sm:w-auto"
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleComplete(patent)}
                          disabled={!isTaskAvailable(patent)}
                          className="w-full sm:w-auto"
                        >
                          Complete & Submit
                        </Button>
                      </div>
                      
                      {!isTaskAvailable(patent) && (
                        <div className="text-amber-600 font-medium text-xs mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTaskBlockedReason(patent)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {renderPagination(filteredActivePatents, activePage, setActivePage)}
            </>
          ) : (
            <EmptyApprovals />
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="min-h-[50vh]">
          {loading ? (
            <LoadingSpinner />
          ) : filteredCompletedPatents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedPatentsPaginated.map(patent => (
                  <Card key={patent.id} className="hover:shadow-md transition-shadow flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-start">
                        <div className="truncate">{patent.patent_title}</div>
                        <StatusBadge status="completed" />
                      </CardTitle>
                      <CardDescription>ID: {patent.tracking_id}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                      <div className="space-y-2 text-sm flex-grow">
                        <div><span className="font-medium">Applicant:</span> {patent.patent_applicant}</div>
                        <div><span className="font-medium">Client ID:</span> {patent.client_id}</div>
                        <div><span className="font-medium">Filing Date:</span> {formatDate(patent.date_of_filing)}</div>
                      </div>
                      
                      <div className="pt-4 mt-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/patents/${patent.id}`)}
                          className="w-full"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {renderPagination(filteredCompletedPatents, completedPage, setCompletedPage)}
            </>
          ) : (
            <EmptyApprovals />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Drafts;
