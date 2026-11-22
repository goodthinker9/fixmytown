// Convenience hook so components do `const { user, logout } = useAuth()`
// instead of importing AuthContext + useContext everywhere.
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

export function useAuth() {
  return useContext(AuthContext);
}

export default useAuth;
