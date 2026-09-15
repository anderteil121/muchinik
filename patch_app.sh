sed -i -e '/  return (/i\
  const currentUser = state.users.find(u => u.id === user.id) || user;' src/App.tsx

sed -i -e 's/user.role/currentUser.role/g' src/App.tsx
sed -i -e 's/user.nickname/currentUser.nickname/g' src/App.tsx
sed -i -e 's/user.fullname/currentUser.fullname/g' src/App.tsx
sed -i -e 's/user.username/currentUser.username/g' src/App.tsx
sed -i -e 's/admin={user}/admin={currentUser}/g' src/App.tsx
sed -i -e 's/user={user}/user={currentUser}/g' src/App.tsx
