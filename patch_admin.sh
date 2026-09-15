sed -i -e '/<StudentProfile adminView student={selectedStudent}/c\
          <StudentProfile adminView student={state.users.find(u => u.id === selectedStudent.id) || selectedStudent} state={state} onClose={() => setSelectedStudent(null)} />' src/components/AdminPanel.tsx
