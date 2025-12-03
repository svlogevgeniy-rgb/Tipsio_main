'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Building2, Search, MoreVertical, Ban, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AuroraBackground } from '@/components/layout/aurora-background'

interface Venue {
  id: string
  name: string
  area: string
  midtransStatus: 'LIVE' | 'TEST' | 'NOT_CONNECTED'
  status: 'ACTIVE' | 'BLOCKED'
  totalVolume: number
  lastActivity: string
  staffCount: number
}

interface ApiVenue extends Omit<Venue, 'lastActivity'> {
  lastActivity: string | null
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/venues')
      if (!res.ok) throw new Error('Failed to fetch venues')
      const data = await res.json()
      
      // Format the data for display
      const formattedVenues = data.map((venue: ApiVenue) => ({
        id: venue.id,
        name: venue.name,
        area: venue.area,
        midtransStatus: venue.midtransStatus,
        status: venue.status,
        totalVolume: venue.totalVolume,
        lastActivity: venue.lastActivity ? formatLastActivity(new Date(venue.lastActivity)) : 'Never',
        staffCount: venue.staffCount
      }))
      
      setVenues(formattedVenues)
    } catch (error) {
      console.error('Error fetching venues:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  const formatLastActivity = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }


  const handleBlock = async (venueId: string) => {
    const venue = venues.find(v => v.id === venueId)
    if (!venue) return
    
    const newStatus = venue.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'
    
    try {
      const res = await fetch('/api/admin/venues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, status: newStatus })
      })
      
      if (!res.ok) throw new Error('Failed to update venue')
      
      // Update local state
      setVenues(venues.map(v => 
        v.id === venueId ? { ...v, status: newStatus } : v
      ))
    } catch (error) {
      console.error('Error updating venue:', error)
      alert('Failed to update venue status')
    }
  }

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(search.toLowerCase()) ||
                         venue.area.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'live' && venue.midtransStatus === 'LIVE' && venue.status === 'ACTIVE') ||
                         (statusFilter === 'test' && venue.midtransStatus === 'TEST') ||
                         (statusFilter === 'blocked' && venue.status === 'BLOCKED')
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'decimal' }).format(amount)
  }

  const getMidtransStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🟢 Live</Badge>
      case 'TEST':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🟡 Test</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">⚪ Not connected</Badge>
    }
  }

  return (
    <AuroraBackground>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-heading font-bold text-white">Venues</h1>
            </div>
            <p className="text-muted-foreground">Manage all registered venues on the platform</p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or area..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All venues</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test mode</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>


          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Total venues</p>
              <p className="text-2xl font-bold text-white">{venues.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Live</p>
              <p className="text-2xl font-bold text-green-400">
                {venues.filter(v => v.midtransStatus === 'LIVE' && v.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Test mode</p>
              <p className="text-2xl font-bold text-yellow-400">
                {venues.filter(v => v.midtransStatus === 'TEST').length}
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Blocked</p>
              <p className="text-2xl font-bold text-red-400">
                {venues.filter(v => v.status === 'BLOCKED').length}
              </p>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Venue</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Midtrans</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total volume</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Staff</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last activity</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.map((venue, index) => (
                    <motion.tr
                      key={venue.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        venue.status === 'BLOCKED' ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-white">{venue.name}</p>
                          <p className="text-sm text-muted-foreground">{venue.area}</p>
                        </div>
                      </td>
                      <td className="p-4">{getMidtransStatusBadge(venue.midtransStatus)}</td>
                      <td className="p-4">
                        <span className="text-primary font-medium">Rp {formatCurrency(venue.totalVolume)}</span>
                      </td>
                      <td className="p-4 text-white">{venue.staffCount}</td>
                      <td className="p-4 text-muted-foreground">{venue.lastActivity}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10">
                            <DropdownMenuItem className="cursor-pointer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => handleBlock(venue.id)}
                            >
                              {venue.status === 'BLOCKED' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                  <span className="text-green-400">Unblock</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2 text-red-400" />
                                  <span className="text-red-400">Block</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </AuroraBackground>
  )
}
