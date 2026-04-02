package domain

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Session represents an isolated lab environment backed by a Docker network.
type Session struct {
	// ID is a unique identifier for this session.
	ID string `json:"id"`
	// Name is a human-readable label chosen by the user.
	Name string `json:"name"`
	// Template selects the pre-configured environment size: "small", "medium", "large".
	Template string `json:"template"`
	// Status is the current state: "creating", "running", "stopping", "stopped", "error".
	Status string `json:"status"`
	// NetworkID is the Docker network backing this session's isolated environment.
	NetworkID string `json:"network_id"`
	// Subnet is the CIDR block assigned to this session's network.
	Subnet string `json:"subnet"`
	// Machines contains all containers (virtual machines) in this session.
	Machines []Machine `json:"machines"`
	// Connections contains all links between services in this session.
	Connections []Connection `json:"connections"`
	// CreatedAt records when the session was created.
	CreatedAt time.Time `json:"created_at"`
}

// SessionStore is a concurrency-safe in-memory store for sessions.
// Phase 1 has no database — everything lives here.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	// counter tracks the next subnet octet for auto-generated 10.100.X.0/24 networks.
	counter int
}

// NewSessionStore creates an empty session store ready for use.
func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: make(map[string]*Session),
		counter:  1,
	}
}

// NextSubnet returns the next available subnet in the 10.100.X.0/24 range
// and advances the internal counter. Thread-safe.
func (s *SessionStore) NextSubnet() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	subnet := fmt.Sprintf("10.100.%d.0/24", s.counter)
	s.counter++
	return subnet
}

// Create stores a new session. It generates a UUID and sets CreatedAt automatically.
func (s *SessionStore) Create(name, template, networkID, subnet string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess := &Session{
		ID:          uuid.New().String(),
		Name:        name,
		Template:    template,
		Status:      "running",
		NetworkID:   networkID,
		Subnet:      subnet,
		Machines:    []Machine{},
		Connections: []Connection{},
		CreatedAt:   time.Now().UTC(),
	}
	s.sessions[sess.ID] = sess
	return sess
}

// Get returns a session by ID, or an error if not found.
func (s *SessionStore) Get(id string) (*Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session %q not found", id)
	}
	return sess, nil
}

// List returns all sessions as a slice.
func (s *SessionStore) List() []*Session {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*Session, 0, len(s.sessions))
	for _, sess := range s.sessions {
		result = append(result, sess)
	}
	return result
}

// Delete removes a session from the store by ID. Returns an error if not found.
func (s *SessionStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[id]; !ok {
		return fmt.Errorf("session %q not found", id)
	}
	delete(s.sessions, id)
	return nil
}

// AddMachine appends a machine to the given session. Returns an error if the session is not found.
func (s *SessionStore) AddMachine(sessionID string, m Machine) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	sess.Machines = append(sess.Machines, m)
	return nil
}

// RemoveMachine removes a machine from the session by ID.
func (s *SessionStore) RemoveMachine(sessionID, machineID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Machines {
		if sess.Machines[i].ID == machineID {
			sess.Machines = append(sess.Machines[:i], sess.Machines[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("machine %q not found in session %q", machineID, sessionID)
}

// UpdateMachinePosition sets the X/Y canvas coordinates for a machine.
// Returns an error if the session or machine is not found.
func (s *SessionStore) UpdateMachinePosition(sessionID, machineID string, x, y float64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Machines {
		if sess.Machines[i].ID == machineID {
			sess.Machines[i].PositionX = x
			sess.Machines[i].PositionY = y
			return nil
		}
	}
	return fmt.Errorf("machine %q not found in session %q", machineID, sessionID)
}

// AddServiceToMachine appends a service instance to the specified machine.
// Returns an error if the session or machine is not found.
func (s *SessionStore) AddServiceToMachine(sessionID, machineID string, svc ServiceInst) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Machines {
		if sess.Machines[i].ID == machineID {
			sess.Machines[i].Services = append(sess.Machines[i].Services, svc)
			return nil
		}
	}
	return fmt.Errorf("machine %q not found in session %q", machineID, sessionID)
}

// UpdateServiceStatus updates the status and installed flag of a service instance.
func (s *SessionStore) UpdateServiceStatus(sessionID, machineID, serviceID, status string, installed bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Machines {
		if sess.Machines[i].ID == machineID {
			for j := range sess.Machines[i].Services {
				if sess.Machines[i].Services[j].ID == serviceID {
					sess.Machines[i].Services[j].Status = status
					sess.Machines[i].Services[j].Installed = installed
					return nil
				}
			}
			return fmt.Errorf("service %q not found on machine %q", serviceID, machineID)
		}
	}
	return fmt.Errorf("machine %q not found in session %q", machineID, sessionID)
}

// RemoveServiceFromMachine removes a service instance by ID from the specified machine.
// Returns an error if the session, machine, or service is not found.
func (s *SessionStore) RemoveServiceFromMachine(sessionID, machineID, serviceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Machines {
		if sess.Machines[i].ID == machineID {
			svcs := sess.Machines[i].Services
			for j := range svcs {
				if svcs[j].ID == serviceID {
					sess.Machines[i].Services = append(svcs[:j], svcs[j+1:]...)
					return nil
				}
			}
			return fmt.Errorf("service %q not found on machine %q", serviceID, machineID)
		}
	}
	return fmt.Errorf("machine %q not found in session %q", machineID, sessionID)
}

// AddConnection appends a connection to the given session.
// Returns an error if the session is not found.
func (s *SessionStore) AddConnection(sessionID string, c Connection) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	sess.Connections = append(sess.Connections, c)
	return nil
}

// RemoveConnection removes a connection by ID from the given session.
// Returns an error if the session or connection is not found.
func (s *SessionStore) RemoveConnection(sessionID, connectionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return fmt.Errorf("session %q not found", sessionID)
	}
	for i := range sess.Connections {
		if sess.Connections[i].ID == connectionID {
			sess.Connections = append(sess.Connections[:i], sess.Connections[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("connection %q not found in session %q", connectionID, sessionID)
}

// ListConnections returns all connections for the given session.
// Returns an error if the session is not found.
func (s *SessionStore) ListConnections(sessionID string) ([]Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session %q not found", sessionID)
	}
	return sess.Connections, nil
}
