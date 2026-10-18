-- Data only: register the additional layouts for the existing template FK.
-- Existing CVs, template rows, permissions and database structure are unchanged.
INSERT INTO public.templates (id,name,description,category,is_default,sort_order,latex_template) VALUES
('timeline','Timeline','Chronological career history with a separate date rail.','ats',FALSE,17,'timeline'),
('editorial','Editorial','Editorial typography with a right-hand information rail.','creative',FALSE,18,'editorial'),
('consultant','Consultant','Business narrative with outer-margin section labels.','business',FALSE,19,'consultant'),
('architect','Architect','Portfolio-first composition with a dark identity panel.','creative',FALSE,20,'architect'),
('scholar','Scholar','Research profile with education in a side rail.','academic',FALSE,21,'scholar'),
('graduate','Graduate','Education and projects first for early careers.','ats',FALSE,22,'graduate'),
('legal','Legal','Formal serif layout with a restrained contact ledger.','business',FALSE,23,'legal'),
('product','Product','Project-led narrative with a competency sidebar.','tech',FALSE,24,'product')
ON CONFLICT (id) DO NOTHING;
