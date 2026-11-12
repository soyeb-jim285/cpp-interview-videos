-- ::: answer / tip / warning  ->  tcolorbox environments
local kinds = { answer = true, tip = true, warning = true }
function Div(el)
  for _, c in ipairs(el.classes) do
    if kinds[c] then
      local out = { pandoc.RawBlock("latex", "\\begin{" .. c .. "box}") }
      for _, b in ipairs(el.content) do table.insert(out, b) end
      table.insert(out, pandoc.RawBlock("latex", "\\end{" .. c .. "box}"))
      return out
    end
  end
end

-- ```output blocks -> dark terminal box (escaped text, no verbatim)
local function esc(line)
  line = line:gsub("\\", "\\textbackslash{}")
  line = line:gsub("([%%#%$&_{}])", "\\%1")
  line = line:gsub("~", "\\textasciitilde{}"):gsub("%^", "\\textasciicircum{}")
  line = line:gsub(" ", "~")
  if line == "" then line = "~" end
  return line
end
function CodeBlock(el)
  if el.classes:includes("output") then
    local out = {}
    for line in (el.text .. "\n"):gmatch("(.-)\n") do table.insert(out, esc(line)) end
    return pandoc.RawBlock("latex", "\\begin{outputbox}\\ttfamily\\color{white}"
      .. table.concat(out, "\\\\\n") .. "\\end{outputbox}")
  end
end
