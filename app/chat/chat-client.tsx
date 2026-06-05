"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare, Send, Search, LogOut, Plus, User,
  Settings, CheckCheck, Smile, Phone, Video, MoreVertical,
  Image as ImageIcon, Paperclip, ChevronLeft, Menu
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { signOut } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export default function ChatClient({ currentUser }: { currentUser: Profile }) {
  const [conversations, setConversations] = useState([
    {
      id: "1",
      name: "Olivia Wilson",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      lastMessage: "Sounds great! Let's meet at 5 PM.",
      time: "10:30 AM",
      unread: 2,
      isOnline: true,
      bio: "Product designer & coffee lover"
    },
    {
      id: "2",
      name: "Dev Team",
      avatar: "",
      lastMessage: "Alex: I pushed the fix for Prisma schema.",
      time: "9:15 AM",
      unread: 0,
      isOnline: false,
      isGroup: true,
      bio: "Official engineering channel"
    },
    {
      id: "3",
      name: "Marcus Vance",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      lastMessage: "Did you check the new API docs?",
      time: "Yesterday",
      unread: 0,
      isOnline: true,
      bio: "Senior backend dev"
    }
  ]);

  const [activeChatId, setActiveChatId] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState<Record<string, Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    time: string;
  }>>>({
    "1": [
      { id: "101", senderId: "other", senderName: "Olivia Wilson", senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", content: "Hey! How's the implementation going?", time: "10:24 AM" },
      { id: "102", senderId: currentUser.id, senderName: currentUser.fullName || currentUser.username, content: "Going really well! Just wrapping up the Next.js and Supabase authentication flows.", time: "10:26 AM" },
      { id: "103", senderId: "other", senderName: "Olivia Wilson", senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", content: "Sounds great! Let's meet at 5 PM.", time: "10:30 AM" }
    ],
    "2": [
      { id: "201", senderId: "other", senderName: "Alex", content: "I pushed the fix for Prisma schema.", time: "9:15 AM" }
    ],
    "3": [
      { id: "301", senderId: "other", senderName: "Marcus Vance", senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", content: "Did you check the new API docs?", time: "Yesterday" }
    ]
  });

  const activeChat = conversations.find(c => c.id === activeChatId) || conversations[0];
  const currentChatMessages = messages[activeChat.id] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.fullName || currentUser.username,
      content: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMessage]
    }));

    // Update last message in conversation list
    setConversations(prev => prev.map(c => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessage: messageText,
          time: "Just now"
        };
      }
      return c;
    }));

    setMessageText("");

    // Simulate reply
    setTimeout(() => {
      const reply = {
        id: (Date.now() + 1).toString(),
        senderId: "other",
        senderName: activeChat.name,
        senderAvatar: activeChat.avatar,
        content: `Thanks for messaging! (Simulated response to: "${messageText}")`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), reply]
      }));
      setConversations(prev => prev.map(c => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            lastMessage: reply.content,
            time: "Just now"
          };
        }
        return c;
      }));
    }, 1500);
  };

  const handleCreateChat = () => {
    const name = prompt("Enter contact name:");
    if (!name) return;
    const newId = Date.now().toString();
    setConversations(prev => [
      ...prev,
      {
        id: newId,
        name,
        avatar: "",
        lastMessage: "No messages yet",
        time: "Just now",
        unread: 0,
        isOnline: true,
        bio: "Hey there! I am using ChatApp."
      }
    ]);
    setMessages(prev => ({
      ...prev,
      [newId]: []
    }));
    setActiveChatId(newId);
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? "w-80" : "w-0 md:w-20"} 
        transition-all duration-300 ease-in-out flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full relative z-20
      `}>
        {/* User Info Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-10 w-10 ring-2 ring-indigo-500/20">
              <AvatarImage src={currentUser.avatarUrl || ""} />
              <AvatarFallback className="bg-indigo-600 text-white font-bold">
                {(currentUser.fullName || currentUser.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-semibold text-sm text-zinc-950 dark:text-white truncate">
                  {currentUser.fullName || currentUser.username}
                </span>
                <span className="text-xs text-zinc-500 truncate">@{currentUser.username}</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
                  <Settings className="h-5 w-5" />
                </Button>
              }>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <DropdownMenuItem className="text-sm font-medium p-2 text-zinc-700 dark:text-zinc-300">
                  <User className="h-4 w-4 mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-sm font-medium p-2 text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850"
              />
            </div>
          </div>
        )}

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map(c => {
              const isActive = c.id === activeChatId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChatId(c.id);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                    ${isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-50"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300"}
                  `}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {c.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {c.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-900" />
                    )}
                  </div>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate">{c.name}</span>
                        <span className="text-[10px] text-zinc-400">{c.time}</span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{c.lastMessage}</p>
                    </div>
                  )}
                  {sidebarOpen && c.unread > 0 && (
                    <span className="shrink-0 bg-indigo-600 text-white rounded-full text-[10px] font-bold h-5 w-5 flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Action Button */}
        {sidebarOpen && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button onClick={handleCreateChat} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Plus className="h-4 w-4" /> New Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between relative z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={activeChat.avatar} />
              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {activeChat.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <h3 className="font-semibold text-sm text-zinc-950 dark:text-white truncate">{activeChat.name}</h3>
              <p className="text-xs text-zinc-500 truncate">
                {activeChat.isOnline ? "Online" : "Offline"} • {activeChat.bio}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Message Feed */}
        <ScrollArea className="flex-1 p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="space-y-4 max-w-4xl mx-auto">
            {currentChatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <MessageSquare className="h-12 w-12 text-zinc-300 mb-3" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Type a message below to start the conversation!</p>
              </div>
            ) : (
              currentChatMessages.map(m => {
                const isMe = m.senderId === currentUser.id;
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <Avatar className="h-8 w-8 shrink-0 self-end mb-1">
                        <AvatarImage src={m.senderAvatar} />
                        <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300">
                          {m.senderName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col max-w-[70%]">
                      {!isMe && (
                        <span className="text-[10px] font-medium text-zinc-500 ml-1 mb-0.5">{m.senderName}</span>
                      )}
                      <div className={`
                        p-3 rounded-2xl text-sm shadow-sm
                        ${isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white rounded-bl-none border border-zinc-200/50 dark:border-zinc-750"}
                      `}>
                        {m.content}
                      </div>
                      <span className={`text-[9px] text-zinc-400 mt-1 flex items-center gap-1 ${isMe ? "justify-end mr-1" : "ml-1"}`}>
                        {m.time} {isMe && <CheckCheck className="h-3 w-3 text-indigo-500" />}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <ImageIcon className="h-5 w-5" />
            </Button>

            <Input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-full py-5 px-4 text-sm"
            />

            <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              <Smile className="h-5 w-5" />
            </Button>
            <Button type="submit" disabled={!messageText.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
