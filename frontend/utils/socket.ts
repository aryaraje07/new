import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (userId: string, userRole: string) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
    query: {
      userId,
      userRole
    }
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event listeners for grievances
export const socketEvents = {
  // Student events
  onGrievanceSolvedVerification: (callback: (data: any) => void) => {
    if (socket) socket.on('grievance_solved_verification', callback);
  },
  
  onFacultyMessage: (callback: (data: any) => void) => {
    if (socket) socket.on('faculty_message', callback);
  },

  // Faculty events  
  onStudentMessage: (callback: (data: any) => void) => {
    if (socket) socket.on('student_message', callback);
  },
  
  onStudentResolutionConfirmation: (callback: (data: any) => void) => {
    if (socket) socket.on('student_resolution_confirmation', callback);
  },

  // Remove listeners
  offGrievanceSolvedVerification: () => {
    if (socket) socket.off('grievance_solved_verification');
  },
  
  offFacultyMessage: () => {
    if (socket) socket.off('faculty_message');
  },
  
  offStudentMessage: () => {
    if (socket) socket.off('student_message');
  },
  
  offStudentResolutionConfirmation: () => {
    if (socket) socket.off('student_resolution_confirmation');
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  socketEvents
};
