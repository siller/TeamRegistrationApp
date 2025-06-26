import React, { useState, useEffect } from 'react';
import { Users, Calendar, Lock, LogOut, Plus, Edit3, Trash2, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const TeamRegistrationApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('events');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth state listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadEvents();
    } else {
      setEvents([]);
      setTeams([]);
      setSelectedEvent(null);
      setCurrentView('events');
    }
  }, [user]);

  // Load events
  const loadEvents = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
      alert('Fehler beim Laden der Events: ' + error.message);
    } else {
      setEvents(data || []);
    }
  };

  // Load teams
  const loadTeams = async (eventId) => {
    if (!eventId) return;

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        profiles!teams_captain_id_fkey(full_name, email),
        team_members(*)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Error loading teams:', teamsError);
      alert('Fehler beim Laden der Teams: ' + teamsError.message);
    } else {
      setTeams(teamsData || []);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });

    if (error) {
      console.error('Login error:', error);
      alert('Anmeldung fehlgeschlagen: ' + error.message);
    }
  };

  // Logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
  };

  // Create event
  const createEvent = async (eventData) => {
    if (!user) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        description: eventData.description,
        event_date: eventData.date,
        max_teams: eventData.maxTeams,
        created_by: user.id
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      console.error('Error creating event:', error);
      alert('Fehler beim Erstellen des Events: ' + error.message);
    } else {
      setEvents([data, ...events]);
      setCurrentView('events');
    }
  };

  // Create or update team
  const saveTeam = async (teamData) => {
    if (!user || !selectedEvent) return;

    setIsSubmitting(true);

    if (editingTeam) {
      // Update existing team
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          team_name: teamData.teamName
        })
        .eq('id', editingTeam.id);

      if (teamError) {
        console.error('Error updating team:', teamError);
        alert('Fehler beim Aktualisieren des Teams: ' + teamError.message);
        setIsSubmitting(false);
        return;
      }

      // Delete existing team members
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', editingTeam.id);

      // Insert updated team members
      const memberInserts = teamData.members.map((member, index) => ({
        team_id: editingTeam.id,
        member_name: member.name,
        member_email: member.email,
        member_position: index + 1
      }));

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(memberInserts);

      if (memberError) {
        console.error('Error updating team members:', memberError);
        alert('Fehler beim Aktualisieren der Teammitglieder: ' + memberError.message);
      } else {
        loadTeams(selectedEvent.id);
        setShowTeamForm(false);
        setEditingTeam(null);
      }
    } else {
      // Generate team code
      const { data: codeData } = await supabase.rpc('generate_team_code');
      const teamCode = codeData;

      // Create new team
      const { data: teamResult, error: teamError } = await supabase
        .from('teams')
        .insert({
          team_name: teamData.teamName,
          team_code: teamCode,
          event_id: selectedEvent.id,
          captain_id: user.id
        })
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        alert('Fehler beim Erstellen des Teams: ' + teamError.message);
        setIsSubmitting(false);
        return;
      }

      // Insert team members
      const memberInserts = teamData.members.map((member, index) => ({
        team_id: teamResult.id,
        member_name: member.name,
        member_email: member.email,
        member_position: index + 1
      }));

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(memberInserts);

      if (memberError) {
        console.error('Error creating team members:', memberError);
        alert('Fehler beim Hinzufügen der Teammitglieder: ' + memberError.message);
      } else {
        loadTeams(selectedEvent.id);
        setShowTeamForm(false);
      }
    }

    setIsSubmitting(false);
  };

  // Delete team
  const deleteTeam = async (teamId) => {
    if (!confirm('Möchten Sie dieses Team wirklich löschen?')) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);
      alert('Fehler beim Löschen des Teams: ' + error.message);
    } else {
      loadTeams(selectedEvent.id);
    }
  };

  // Select event and load its teams
  const selectEvent = (event) => {
    setSelectedEvent(event);
    setCurrentView('teams');
    loadTeams(event.id);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Registration</h1>
            <p className="text-gray-600">Melden Sie sich mit Ihrem Google-Konto an, um Teams zu verwalten</p>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-medium">Mit Google anmelden</span>
          </button>
        </div>
      </div>
    );
  }

  // Event Form Component
  const EventForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      date: '',
      maxTeams: 20
    });

    const handleSubmit = () => {
      if (formData.name && formData.date) {
        onSubmit(formData);
        setFormData({ name: '', description: '', date: '', maxTeams: 20 });
      } else {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
      }
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Neues Event erstellen</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Firmen-Turnier 2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Event Beschreibung..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max. Anzahl Teams</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxTeams}
              onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value) || 20})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Event erstellen</span>
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Team Form Component
  const TeamForm = ({ team, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      teamName: team?.team_name || '',
      members: team?.team_members ? 
        team.team_members.sort((a, b) => a.member_position - b.member_position).map(m => ({
          name: m.member_name,
          email: m.member_email
        })) :
        [
          { name: '', email: '' },
          { name: '', email: '' },
          { name: '', email: '' },
          { name: '', email: '' }
        ]
    });

    const updateMember = (index, field, value) => {
      const newMembers = [...formData.members];
      newMembers[index][field] = value;
      setFormData({...formData, members: newMembers});
    };

    const handleSubmit = () => {
      if (!formData.teamName.trim()) {
        alert('Bitte geben Sie einen Team-Namen ein.');
        return;
      }

      const allMembersFilled = formData.members.every(member => 
        member.name.trim() && member.email.trim()
      );

      if (!allMembersFilled) {
        alert('Bitte füllen Sie alle Teammitglieder-Felder aus.');
        return;
      }

      onSubmit(formData);
    };

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">
          {team ? 'Team bearbeiten' : 'Neues Team anmelden'}
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
            <input
              type="text"
              value={formData.teamName}
              onChange={(e) => setFormData({...formData, teamName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Die Gewinner"
            />
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Teammitglieder (4 Personen erforderlich) *</h4>
            <div className="space-y-4">
              {formData.members.map((member, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Mitglied {index + 1}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Vollständiger Name"
                    />
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(index, 'email', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E-Mail Adresse"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{team ? 'Team aktualisieren' : 'Team anmelden'}</span>
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main App Content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Team Registration</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name || user.email)}&background=4285f4&color=fff`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full" 
                />
                <span className="text-sm font-medium text-gray-700">{user.user_metadata?.full_name || user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Abmelden"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => {setCurrentView('events'); setSelectedEvent(null);}}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'events' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Events
            </button>
            {selectedEvent && (
              <button
                onClick={() => setCurrentView('teams')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'teams' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Teams verwalten
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Events View */}
        {currentView === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Events</h2>
              <button
                onClick={() => setCurrentView('createEvent')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Event erstellen</span>
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Events</h3>
                <p className="text-gray-500">Erstellen Sie Ihr erstes Event, um Teams anzumelden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => {
                  const eventTeams = teams.filter(team => team.event_id === event.id);
                  return (
                    <div key={event.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {eventTeams.length}/{event.max_teams} Teams
                        </span>
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.event_date).toLocaleDateString('de-DE')}</span>
                      </div>

                      <button
                        onClick={() => selectEvent(event)}
                        className="w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        Teams verwalten
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Event View */}
        {currentView === 'createEvent' && (
          <div className="max-w-2xl">
            <EventForm
              onSubmit={createEvent}
              onCancel={() => setCurrentView('events')}
            />
          </div>
        )}

        {/* Teams View */}
        {currentView === 'teams' && selectedEvent && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h2>
                <p className="text-gray-600">Teams für dieses Event</p>
              </div>
              <button
                onClick={() => setShowTeamForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Team anmelden</span>
              </button>
            </div>

            {showTeamForm && (
              <TeamForm
                team={editingTeam}
                onSubmit={saveTeam}
                onCancel={() => {setShowTeamForm(false); setEditingTeam(null);}}
              />
            )}

            {/* Teams List */}
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Teams angemeldet</h3>
                <p className="text-gray-500">Melden Sie das erste Team für dieses Event an.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{team.team_name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Lock className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-mono font-bold text-lg">#{team.team_code}</span>
                        </div>
                      </div>
                      
                      {user.id === team.captain_id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {setEditingTeam(team); setShowTeamForm(true);}}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Team bearbeiten"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Team löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Captain:</span>
                        <span>{team.profiles?.full_name || team.profiles?.email}</span>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Teammitglieder:</h4>
                        <div className="space-y-1">
                          {team.team_members?.sort((a, b) => a.member_position - b.member_position).map((member, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{member.member_name}</span>
                              <span className="text-gray-500">{member.member_email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                      Angemeldet am: {new Date(team.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamRegistrationApp;
