-- Persist per-folder audio/sub track choices to .pix_subs / .pix_audio.
-- Loads early (start-file) and enforces again at file-loaded.
-- Suppresses writes until file-loaded to avoid clobbering with mpv defaults.

local mp    = require 'mp'
local utils = require 'mp.utils'
local opts  = require 'mp.options'

local o = { folder = '' }  -- via --script-opts=folder-tracks-folder=/abs/path
opts.read_options(o, "folder-tracks")

local function log(...) mp.msg.info("[folder-tracks]", ...) end

local function get_folder()
  if o.folder and o.folder ~= "" then return o.folder end
  local p = mp.get_property("path")
  if not p or p == "" then return nil end
  local dir = utils.split_path(p)
  return dir
end

local function fallback_dir_for(folder)
  local home = os.getenv("HOME") or ""
  if home == "" then return nil end
  local sanitized = folder:gsub("[^%w%._%-/]", "_"):gsub("/", "__")
  return utils.join_path(home, ".cache/pix/mpv-meta/" .. sanitized)
end

local function ensure_dir(path)
  if not path then return false end
  local r = utils.subprocess({ args = { "mkdir", "-p", path }, playback_only = false })
  return r and r.status == 0
end

local function read_first(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local line = f:read("*l"); f:close()
  return line and (line:gsub("^%s+", ""):gsub("%s+$", "")) or nil
end

local function try_write(path, val)
  local f = io.open(path, "w"); if not f then return false end
  f:write(tostring(val or "auto"), "\n"); f:close(); return true
end

local function meta_paths(folder)
  return (folder and (folder .. "/.pix_subs") or nil),
         (folder and (folder .. "/.pix_audio") or nil)
end

local function fb_meta_paths(folder)
  local fb = fallback_dir_for(folder); if not fb then return nil end
  ensure_dir(fb)
  return (fb .. "/.pix_subs"), (fb .. "/.pix_audio")
end

local sid_last, aid_last
local want_sid, want_aid
local ready = false

local function apply_from_meta()
  local folder = get_folder(); if not folder then return end
  local sub_path, aud_path = meta_paths(folder)
  local fb_sub, fb_aud     = fb_meta_paths(folder)

  local sv = (sub_path and read_first(sub_path)) or (fb_sub and read_first(fb_sub))
  local av = (aud_path and read_first(aud_path)) or (fb_aud and read_first(fb_aud))

  want_sid, want_aid = sv, av

  if sv and sv ~= "" then
    log("apply sid:", sv)
    mp.set_property("sid", sv)
  end
  if av and av ~= "" then
    log("apply aid:", av)
    mp.set_property("aid", av)
  end
end

local function persist()
  if not ready then return end  -- don't write while mpv is still picking defaults
  local folder = get_folder(); if not folder then return end
  local sub_path, aud_path = meta_paths(folder)
  local fb_sub, fb_aud     = fb_meta_paths(folder)

  local sid = mp.get_property("sid")
  local aid = mp.get_property("aid")

  if sid ~= sid_last and sid ~= nil then
    if not (sub_path and try_write(sub_path, sid)) and fb_sub then
      try_write(fb_sub, sid)
      log("wrote", fb_sub, "=", sid)
    else
      log("wrote", sub_path, "=", sid)
    end
    sid_last = sid
  end

  if aid ~= aid_last and aid ~= nil then
    if not (aud_path and try_write(aud_path, aid)) and fb_aud then
      try_write(fb_aud, aid)
      log("wrote", fb_aud, "=", aid)
    else
      log("wrote", aud_path, "=", aid)
    end
    aid_last = aid
  end
end

-- Apply early (may be ignored until tracks exist, but helps)
mp.register_event("start-file", function()
  ready = false
  sid_last, aid_last = nil, nil
  want_sid, want_aid = nil, nil
  apply_from_meta()
end)

-- Enforce once file is loaded, then allow persisting
mp.register_event("file-loaded", function()
  if want_sid then
    mp.set_property("sid", want_sid)
  end
  if want_aid then
    mp.set_property("aid", want_aid)
  end
  -- Now mark ready and snapshot current values
  sid_last = mp.get_property("sid")
  aid_last = mp.get_property("aid")
  ready = true
  persist()  -- ensure files reflect the active selection
end)

mp.observe_property("sid", "string", function() persist() end)
mp.observe_property("aid", "string", function() persist() end)
mp.register_event("end-file", persist)
mp.register_event("shutdown", persist)
