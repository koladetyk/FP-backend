// packages/frontend/src/utils/api.ts

export async function fetchHeadlines() {
  // Use proxy route instead of direct API call
  const res = await fetch('/headlines', {  // This will be proxied to api:4001/headlines
    credentials: 'include' // Include session cookies
  });
  if (!res.ok) throw new Error('Failed to fetch headlines');
  return res.json();
}

// Check current authentication status
export async function checkAuthStatus() {
  try {
    const res = await fetch('/api/me', {  // This gets proxied to api:4001/api/me
      credentials: 'include'
    });
    
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

// Logout function
export async function logout() {
  try {
    const res = await fetch('/api/logout', {  // This gets proxied to api:4001/api/logout
      method: 'POST',
      credentials: 'include'
    });
    
    return res.ok;
  } catch (error) {
    console.error('Logout failed:', error);
    return false;
  }
}