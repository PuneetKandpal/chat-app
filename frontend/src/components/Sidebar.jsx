import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { useDebounce } from "../lib/useDebounce.hook";
import TypingIndicator from "./icons/TypingIndicator";

const Sidebar = () => {
  const {
    getUsers,
    searchUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    usersTyping,
    unreadCounts,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  useEffect(() => {
    getUsers();
  }, [getUsers, onlineUsers]);

  useEffect(() => {

    const usersWithOnlineFirst = users.sort((a, b) => {
          const aIsOnline = onlineUsers.includes(a._id);
          const bIsOnline = onlineUsers.includes(b._id);
          if (aIsOnline && !bIsOnline) {
            return -1; // a comes first
          }
          if (!aIsOnline && bIsOnline) {
            return 1; // b comes first
          }
          return 0; // no change in order
      })

    setFilteredUsers([...usersWithOnlineFirst]);
  }, [users]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      searchUsers(debouncedSearchTerm);
    } else {
      // If the debounced search term is empty, fetch all users.
      // This ensures the 'users' array in the store is reset to the full list.
      getUsers();
    }
  }, [debouncedSearchTerm, searchUsers, getUsers]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const derivedFilteredUsers = users
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))

  useEffect(() => {
    setFilteredUsers(derivedFilteredUsers);
  }, [showOnlineOnly]);


  return (
    <aside className="flex flex-col w-20 h-full transition-all duration-200 border-r lg:w-72 border-base-300">
      <div className="w-full p-5 border-b border-base-300">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="hidden font-medium lg:block">Contacts</span>
        </div>
        {/* TODO: Online filter toggle */}
        <div className="items-center hidden gap-2 mt-3 lg:flex">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-base-300">
        <input
          type="text"
          placeholder="Search user..."
          className="w-full rounded-md input input-bordered input-sm lg:input-md"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      { isUsersLoading ? <SidebarSkeleton /> : <div className="w-full py-3 overflow-y-auto">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="object-cover rounded-full size-12"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 bg-green-500 rounded-full size-3 ring-2 ring-zinc-900" />
              )}
              {usersTyping.has(user._id) && (
                <TypingIndicator className="absolute block -translate-x-1/2 translate-y-1/2 left-1/2 bottom-1/2 lg:hidden" />
              )}
              {unreadCounts && unreadCounts[user._id] > 0 && (
                <span
                  className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white transform bg-yellow-500 rounded-full translate-x-1/4 -translate-y-1/4 ring-2 ring-base-100 lg:translate-x-1/2 lg:-translate-y-1/2"
                >
                  {unreadCounts[user._id]}
                </span>
              )}
            </div>


            {/* User info - only visible on larger screens */}
            <div className="hidden min-w-0 text-left lg:block">
              <div className="flex items-center justify-between">
                <div className="flex items-end gap-2">
                  <span className="font-medium truncate">{user.fullName}</span>
                  {usersTyping.has(user._id) && <span className="text-[10px] text-zinc-500 animate-pulse pb-[2px]">is typing ...</span>}
                </div>
              </div>

              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && searchTerm.length > 0 && (
          <div className="py-4 text-center text-zinc-500">No users found for "{searchTerm}"</div>
        )}
        {filteredUsers.length === 0 && searchTerm.length === 0 && !showOnlineOnly && (
          <div className="py-4 text-center text-zinc-500">No users available</div>
        )}
        {filteredUsers.length === 0 && searchTerm.length === 0 && showOnlineOnly && (
          <div className="py-4 text-center text-zinc-500">No online users</div>
        )}
      </div>}
    </aside>
  );
};
export default Sidebar;
