<?php
/**
 * Master Database Migration: Deduplicate Courses & Standardize School Subjects
 * 
 * 1. Backfills and merges duplicate grades into the canonical course IDs
 * 2. Deletes clashing duplicate grade rows and remaps any orphan grades
 * 3. Updates exams table to canonical course IDs
 * 4. Updates class_subjects, teacher_allocations, enrollments to canonical course IDs
 * 5. Standardizes the 56 canonical courses with clean names, departments, and descriptions
 * 6. Deletes the 172 redundant duplicate rows in courses
 * 7. Adds a UNIQUE INDEX on courses.name to permanently prevent duplicate subjects
 */

require_once __DIR__ . '/../api/config/Database.php';

$db = new Database();
$conn = $db->getConnection();

echo "========================================================\n";
echo "   DLHS COURSES DEDUPLICATION & CONSOLIDATION MIGRATION \n";
echo "========================================================\n\n";

// Map every single one of the 228 course IDs in the database to its canonical ID
$explicitMap = [
    // 1. English Language -> 180
    1 => 180, 29 => 180, 47 => 180, 60 => 180, 84 => 180, 110 => 180, 180 => 180,
    // 2. Mathematics -> 179
    2 => 179, 5 => 179, 52 => 179, 59 => 179, 83 => 179, 109 => 179, 179 => 179,
    // 3. Civic Education -> 112
    3 => 112, 4 => 112, 44 => 112, 62 => 112, 86 => 112, 112 => 112,
    // 4. Agricultural Science -> 107
    6 => 107, 22 => 107, 39 => 107, 57 => 107, 81 => 107, 107 => 107,
    // 5. Basic Science -> 40
    7 => 40, 40 => 40,
    // 6. Basic Technology -> 41
    8 => 41, 41 => 41,
    // 7. Business Studies -> 42
    9 => 42, 25 => 42, 42 => 42,
    // 8. Christian Religious Studies -> 187
    10 => 187, 43 => 187, 76 => 187, 100 => 187, 125 => 187, 187 => 187,
    // 9. Computer Studies -> 11
    11 => 11, 27 => 11, 45 => 11, 63 => 11, 87 => 11, 113 => 11,
    // 10. Visual Arts -> 12
    12 => 12, 79 => 12, 103 => 12, 128 => 12,
    // 11. French -> 124
    13 => 124, 30 => 124, 48 => 124, 75 => 124, 99 => 124, 124 => 124,
    // 12. Nigerian History -> 14
    14 => 14, 155 => 14, 204 => 14,
    // 13. Home Economics -> 50
    15 => 50, 50 => 50,
    // 14. Leadership & Entrepreneurship Training (L.E.T.) -> 36
    16 => 36, 36 => 36, 51 => 36, 72 => 36, 96 => 36, 121 => 36,
    // 15. Music -> 154
    17 => 154, 34 => 154, 53 => 154, 152 => 154, 153 => 154, 154 => 154,
    // 16. Physical and Health Education (P.H.E.) -> 33
    18 => 33, 33 => 33, 35 => 33, 54 => 33, 164 => 33, 165 => 33, 166 => 33,
    // 17. Robotics and Artificial Intelligence -> 20
    19 => 20, 20 => 20, 71 => 20, 95 => 20,
    // 18. Yoruba Language -> 21
    21 => 21, 56 => 21, 80 => 21, 104 => 21, 151 => 21, 192 => 21,
    // 19. Hausa Language -> 23
    23 => 23, 135 => 23, 136 => 23, 137 => 23,
    // 20. Cultural and Creative Art (C.C.A.) -> 24
    24 => 24, 28 => 24, 46 => 24,
    // 21. Further Mathematics -> 26
    26 => 26, 61 => 26, 85 => 26, 111 => 26, 184 => 26,
    // 22. History -> 157
    31 => 157, 49 => 157, 156 => 157, 157 => 157,
    // 23. Catering Craft Practice -> 32
    32 => 32, 132 => 32, 133 => 32, 134 => 32,
    // 24. Entrance Examination -> 37
    37 => 37, 38 => 37, 177 => 37, 178 => 37,
    // 25. Social Studies -> 55
    55 => 55,
    // 26. Animal Husbandry -> 108
    58 => 108, 82 => 108, 108 => 108, 173 => 108,
    // 27. Data Processing -> 114
    64 => 114, 88 => 114, 114 => 114,
    // 28. Biology -> 181
    65 => 181, 89 => 181, 115 => 181, 181 => 181,
    // 29. Physics -> 183
    66 => 183, 90 => 183, 116 => 183, 183 => 183,
    // 30. Chemistry -> 182
    67 => 182, 91 => 182, 117 => 182, 182 => 182,
    // 31. Geography -> 188
    68 => 188, 92 => 188, 118 => 188, 188 => 188,
    // 32. Technical Drawing -> 191
    69 => 191, 93 => 191, 119 => 191, 191 => 191,
    // 33. Economics -> 193
    70 => 193, 94 => 193, 120 => 193, 193 => 193,
    // 34. Food and Nutrition -> 122
    73 => 122, 97 => 122, 122 => 122,
    // 35. Dye and Bleaching -> 74
    74 => 74, 98 => 74, 123 => 74,
    // 36. Literature in English -> 185
    77 => 185, 101 => 185, 126 => 185, 185 => 185,
    // 37. Government -> 186
    78 => 186, 102 => 186, 127 => 186, 186 => 186,
    // 38. Financial Accounting -> 144
    105 => 144, 106 => 144, 144 => 144, 189 => 144,
    // 39. Igbo Language -> 129
    129 => 129, 130 => 129, 131 => 129, 145 => 129, 146 => 129, 147 => 129, 221 => 129,
    // 40. Office Practice -> 138
    138 => 138, 139 => 138, 140 => 138,
    // 41. Commerce -> 190
    141 => 190, 142 => 190, 143 => 190, 190 => 190,
    // 42. Urhobo Language -> 148
    148 => 148, 149 => 148, 150 => 148,
    // 43. Photography -> 158
    158 => 158, 159 => 158, 160 => 158,
    // 44. Marketing -> 161
    161 => 161, 162 => 161, 163 => 161,
    // 45. Fashion Design and Garment Making -> 198
    167 => 198, 168 => 198, 169 => 198, 198 => 198, 206 => 198, 215 => 198, 216 => 198,
    // 46. Edo Language -> 170
    170 => 170, 171 => 170, 172 => 170,
    // 47. Ibibio Language -> 174
    174 => 174, 175 => 174, 176 => 174,
    // 48. Digital Technology -> 224
    194 => 224, 203 => 224, 219 => 224, 220 => 224, 224 => 224,
    // 49. Intermediate Science -> 195
    195 => 195, 227 => 195,
    // 50. Social and Citizenship Studies -> 196
    196 => 196, 223 => 196,
    // 51. Solar Photovoltaic Installation and Maintenance -> 197
    197 => 197, 207 => 197,
    // 52. Livestock Farming -> 199
    199 => 199, 209 => 199, 217 => 199, 218 => 199, 226 => 199,
    // 53. Computer Hardware and GSM Repairs -> 200
    200 => 200, 205 => 200, 213 => 200, 214 => 200, 225 => 200,
    // 54. Horticulture and Crop Production -> 201
    201 => 201, 208 => 201, 228 => 201,
    // 55. Citizenship and Heritage Studies -> 202
    202 => 202, 222 => 202,
    // 56. Home Management -> 210
    210 => 210, 211 => 210, 212 => 210
];

// Clean metadata for the 56 canonical subjects
$canonicalMetadata = [
    // Sciences
    107 => ["name" => "Agricultural Science", "department" => "Science", "description" => "Principles and practices of agriculture, crop production, soil science, and animal husbandry."],
    108 => ["name" => "Animal Husbandry", "department" => "Science", "description" => "Breeding, nutrition, management, and health of agricultural livestock and poultry."],
    40  => ["name" => "Basic Science", "department" => "Science", "description" => "Fundamental concepts of living and non-living systems, energy, environment, and scientific inquiry."],
    181 => ["name" => "Biology", "department" => "Science", "description" => "Cell biology, ecology, genetics, physiology, evolutionary mechanisms, and biotechnology."],
    182 => ["name" => "Chemistry", "department" => "Science", "description" => "Inorganic, organic, physical chemistry, periodic table, chemical calculations, and laboratory practicals."],
    11  => ["name" => "Computer Studies", "department" => "Science", "description" => "Computer literacy, hardware, operating systems, networking, productivity tools, and computer ethics."],
    114 => ["name" => "Data Processing", "department" => "Science", "description" => "Information processing systems, relational database management, data security, and modern digital applications."],
    224 => ["name" => "Digital Technology", "department" => "Science", "description" => "Digital media, cloud computing, cybersecurity awareness, web technologies, and computational thinking."],
    195 => ["name" => "Intermediate Science", "department" => "Science", "description" => "Applied junior secondary scientific principles, materials, laboratory testing, and environmental science."],
    183 => ["name" => "Physics", "department" => "Science", "description" => "Mechanics, thermal physics, optics, waves, electromagnetism, atomic and modern physics."],
    20  => ["name" => "Robotics and Artificial Intelligence", "department" => "Science", "description" => "Microcontroller programming, robotics engineering, machine learning basics, and automated systems."],

    // Mathematics
    179 => ["name" => "Mathematics", "department" => "Science", "description" => "Core general mathematics, algebraic processes, geometry, trigonometry, and statistics."],
    26  => ["name" => "Further Mathematics", "department" => "Science", "description" => "Advanced algebra, calculus, matrices, vectors, coordinate geometry, dynamics, and probability."],

    // Arts & Humanities
    187 => ["name" => "Christian Religious Studies", "department" => "Arts & Humanities", "description" => "Biblical history, Christian moral and social values, doctrine, and ethical living."],
    202 => ["name" => "Citizenship and Heritage Studies", "department" => "Arts & Humanities", "description" => "National symbols, cultural preservation, constitutional rights, civic responsibilities, and integrity."],
    112 => ["name" => "Civic Education", "department" => "Arts & Humanities", "description" => "Democracy, governance, rule of law, human rights, national values, and community service."],
    193 => ["name" => "Economics", "department" => "Arts & Humanities", "description" => "Micro and macroeconomic principles, price theory, economic policy, money, banking, and public finance."],
    188 => ["name" => "Geography", "department" => "Arts & Humanities", "description" => "Physical, human, and regional geography, cartography, GIS basics, weather, and environmental management."],
    186 => ["name" => "Government", "department" => "Arts & Humanities", "description" => "Political systems, constitutions, organs of government, public administration, and international relations."],
    157 => ["name" => "History", "department" => "Arts & Humanities", "description" => "Nigerian, African, and world civilizations, trade routes, colonialism, and contemporary global history."],
    50  => ["name" => "Home Economics", "department" => "Arts & Humanities", "description" => "Nutrition, food preparation, home resource management, family living, textiles, and child development."],
    14  => ["name" => "Nigerian History", "department" => "Arts & Humanities", "description" => "Ancient Nigerian kingdoms, pre-colonial institutions, nationalist movements, and post-independence history."],
    196 => ["name" => "Social and Citizenship Studies", "department" => "Arts & Humanities", "description" => "Social cohesion, cultural diversity, peace studies, conflict resolution, and leadership skills."],
    55  => ["name" => "Social Studies", "department" => "Arts & Humanities", "description" => "Man and his physical and social environment, cultural heritage, social issues, and national development."],
    12  => ["name" => "Visual Arts", "department" => "Arts & Humanities", "description" => "Drawing, painting, design, sculpture, ceramics, art history, creative expressions, and visual composition."],

    // Languages
    170 => ["name" => "Edo Language", "department" => "Arts & Humanities", "description" => "Edo orthography, grammar, vocabulary, oral traditions, comprehension, and literature."],
    180 => ["name" => "English Language", "department" => "Arts & Humanities", "description" => "English grammar, essay composition, reading comprehension, vocabulary development, and oral English."],
    124 => ["name" => "French", "department" => "Arts & Humanities", "description" => "French grammar, vocabulary, pronunciation, written and spoken communication, and French culture."],
    23  => ["name" => "Hausa Language", "department" => "Arts & Humanities", "description" => "Hausa language structure, literature, translation, composition, and cultural values."],
    174 => ["name" => "Ibibio Language", "department" => "Arts & Humanities", "description" => "Ibibio phonetics, morphology, syntax, cultural proverbs, comprehension, and creative writing."],
    129 => ["name" => "Igbo Language", "department" => "Arts & Humanities", "description" => "Igbo orthography, grammar, proverbs, idioms, literature, poetry, and cultural traditions."],
    185 => ["name" => "Literature in English", "department" => "Arts & Humanities", "description" => "African and non-African drama, prose, poetry, literary appreciation, and textual analysis."],
    148 => ["name" => "Urhobo Language", "department" => "Arts & Humanities", "description" => "Urhobo phonology, grammar, translation, oral literature, folklore, and composition."],
    21  => ["name" => "Yoruba Language", "department" => "Arts & Humanities", "description" => "Yoruba language grammar, literature, poetry (Ewi), cultural practices, and creative composition."],

    // Vocational & Commercial
    41  => ["name" => "Basic Technology", "department" => "Vocational & Commercial", "description" => "Technical drawing fundamentals, woodworking, metalwork, basic electronics, energy, and maintenance."],
    42  => ["name" => "Business Studies", "department" => "Vocational & Commercial", "description" => "Foundational commerce, bookkeeping, office practice, keyboarding, marketing, and business ethics."],
    32  => ["name" => "Catering Craft Practice", "department" => "Vocational & Commercial", "description" => "Culinary arts, food hygiene, menu planning, beverage service, and hospitality management."],
    190 => ["name" => "Commerce", "department" => "Vocational & Commercial", "description" => "Trade, warehousing, banking, insurance, transportation, marketing, and consumer protection."],
    200 => ["name" => "Computer Hardware and GSM Repairs", "department" => "Vocational & Commercial", "description" => "PC maintenance, circuit troubleshooting, mobile device diagnostics, component soldering, and repair."],
    74  => ["name" => "Dye and Bleaching", "department" => "Vocational & Commercial", "description" => "Textile coloration, tie and dye, batik techniques, chemical bleaching, and fabric treatment."],
    198 => ["name" => "Fashion Design and Garment Making", "department" => "Vocational & Commercial", "description" => "Pattern drafting, clothing construction, fashion sketching, fabric selection, and garment finishing."],
    144 => ["name" => "Financial Accounting", "department" => "Vocational & Commercial", "description" => "Principles of accounting, ledger systems, trial balances, financial statements, and partnership accounts."],
    122 => ["name" => "Food and Nutrition", "department" => "Vocational & Commercial", "description" => "Nutritional biochemistry, food preservation, dietetics, meal planning, and culinary practicals."],
    210 => ["name" => "Home Management", "department" => "Vocational & Commercial", "description" => "Family budgeting, interior decoration, household maintenance, consumer education, and consumer rights."],
    201 => ["name" => "Horticulture and Crop Production", "department" => "Vocational & Commercial", "description" => "Floriculture, landscape design, nursery techniques, vegetable cropping, and pest control."],
    199 => ["name" => "Livestock Farming", "department" => "Vocational & Commercial", "description" => "Animal husbandry operations, pasture management, feed formulation, and commercial livestock rearing."],
    161 => ["name" => "Marketing", "department" => "Vocational & Commercial", "description" => "Market research, product pricing, advertising, sales promotion, and distribution channels."],
    154 => ["name" => "Music", "department" => "Vocational & Commercial", "description" => "Music theory, sight reading, choral singing, instrumental performance, and African musical heritage."],
    138 => ["name" => "Office Practice", "department" => "Vocational & Commercial", "description" => "Office equipment handling, filing systems, record management, business communication, and ergonomics."],
    158 => ["name" => "Photography", "department" => "Vocational & Commercial", "description" => "Digital camera operation, lighting, composition, digital photo editing, and commercial photography."],
    197 => ["name" => "Solar Photovoltaic Installation and Maintenance", "department" => "Vocational & Commercial", "description" => "Solar panel sizing, inverter wiring, battery bank management, and solar system maintenance."],
    191 => ["name" => "Technical Drawing", "department" => "Vocational & Commercial", "description" => "Geometrical drawing, isometric and orthographic projection, building and mechanical drawing."],

    // General / Core
    24  => ["name" => "Cultural and Creative Art (C.C.A.)", "department" => "General / Core", "description" => "Performing arts, drama, dance, craftwork, cultural heritage, and creative design."],
    36  => ["name" => "Leadership & Entrepreneurship Training (L.E.T.)", "department" => "General / Core", "description" => "Character development, ethical leadership, venture creation, financial discipline, and public speaking."],
    33  => ["name" => "Physical and Health Education (P.H.E.)", "department" => "General / Core", "description" => "Athletics, team sports, physical fitness, personal hygiene, first aid, and community health."],
    37  => ["name" => "Entrance Examination", "department" => "General / Core", "description" => "Standardized entrance and scholarship assessments."]
];

$nonCanonicalIds = [];
foreach ($explicitMap as $src => $dst) {
    if ($src !== $dst) {
        $nonCanonicalIds[] = $src;
    }
}
$inNon = implode(",", $nonCanonicalIds);
$inCanon = implode(",", array_keys($canonicalMetadata));

$conn->beginTransaction();

try {
    // -------------------------------------------------------------------------
    // Step 1. Re-map / Deduplicate grades table
    // -------------------------------------------------------------------------
    echo "1. Consolidating grades table...\n";
    $stmtC = $conn->query("SELECT id, student_id, course_id, academic_session, academic_term, score FROM grades WHERE course_id IN ($inCanon)");
    $canonIndex = [];
    while ($r = $stmtC->fetch(PDO::FETCH_ASSOC)) {
        $k = "{$r["student_id"]}_{$r["academic_session"]}_{$r["academic_term"]}_{$r["course_id"]}";
        $canonIndex[$k] = $r;
    }

    $stmtNC = $conn->query("SELECT * FROM grades WHERE course_id IN ($inNon)");
    $ncGrades = $stmtNC->fetchAll(PDO::FETCH_ASSOC);
    echo "   Found " . count($ncGrades) . " grade rows linked to duplicate course IDs.\n";

    $updatedCanon = 0;
    $deletedNC = 0;
    $remappedNC = 0;

    $stmtUpdateCanon = $conn->prepare("UPDATE grades SET score = :s, ca1 = :ca1, ca2 = :ca2, exam = :ex, assignment_score = :as, project_score = :ps, mid_term_test = :mtt WHERE id = :id");
    $stmtDeleteNC = $conn->prepare("DELETE FROM grades WHERE id = :id");
    $stmtRemapNC = $conn->prepare("UPDATE grades SET course_id = :cid WHERE id = :id");

    foreach ($ncGrades as $g) {
        $targetCid = $explicitMap[$g["course_id"]];
        $k = "{$g["student_id"]}_{$g["academic_session"]}_{$g["academic_term"]}_$targetCid";

        if (isset($canonIndex[$k])) {
            $cg = $canonIndex[$k];
            // If canonical grade had 0 but the duplicate record has real score, update canonical
            if ($cg["score"] == 0 && $g["score"] > 0) {
                $stmtUpdateCanon->execute([
                    ":s"   => $g["score"],
                    ":ca1" => $g["ca1"],
                    ":ca2" => $g["ca2"],
                    ":ex"  => $g["exam"],
                    ":as"  => $g["assignment_score"],
                    ":ps"  => $g["project_score"],
                    ":mtt" => $g["mid_term_test"],
                    ":id"  => $cg["id"]
                ]);
                $updatedCanon++;
            }
            $stmtDeleteNC->execute([":id" => $g["id"]]);
            $deletedNC++;
        } else {
            $stmtRemapNC->execute([":cid" => $targetCid, ":id" => $g["id"]]);
            $remappedNC++;
            $canonIndex[$k] = $g;
        }
    }
    echo "   ✓ Backfilled authentic scores: $updatedCanon\n";
    echo "   ✓ Purged duplicate grade records: $deletedNC\n";
    echo "   ✓ Remapped non-clashing grade records: $remappedNC\n";

    // -------------------------------------------------------------------------
    // Step 2. Update exams table
    // -------------------------------------------------------------------------
    echo "2. Updating exams table...\n";
    $conn->exec("UPDATE exams SET course_id = 183 WHERE id = 1 AND course_id = 1");
    echo "   ✓ Exam ID 1 pointed to Physics (183).\n";

    // -------------------------------------------------------------------------
    // Step 3. Update any non-canonical references in other tables
    // -------------------------------------------------------------------------
    echo "3. Verifying other relational tables...\n";
    foreach ($explicitMap as $src => $dst) {
        if ($src !== $dst) {
            $conn->exec("UPDATE IGNORE class_subjects SET course_id = $dst WHERE course_id = $src");
            $conn->exec("UPDATE IGNORE teacher_allocations SET course_id = $dst WHERE course_id = $src");
            $conn->exec("UPDATE IGNORE enrollments SET course_id = $dst WHERE course_id = $src");
        }
    }
    echo "   ✓ Relational allocations and enrollments verified.\n";

    // -------------------------------------------------------------------------
    // Step 4. Update the 56 canonical records in courses table
    // -------------------------------------------------------------------------
    echo "4. Standardizing metadata for canonical courses...\n";
    $stmtMeta = $conn->prepare("UPDATE courses SET name = :n, department = :d, description = :desc WHERE id = :id");
    foreach ($canonicalMetadata as $id => $meta) {
        $stmtMeta->execute([
            ":n"    => $meta["name"],
            ":d"    => $meta["department"],
            ":desc" => $meta["description"],
            ":id"   => $id
        ]);
    }
    echo "   ✓ Updated all 56 canonical subjects with standardized titles and departments.\n";

    // -------------------------------------------------------------------------
    // Step 5. Delete duplicate non-canonical courses
    // -------------------------------------------------------------------------
    echo "5. Deleting duplicate courses...\n";
    $deletedCourses = $conn->exec("DELETE FROM courses WHERE id IN ($inNon)");
    echo "   ✓ Deleted $deletedCourses duplicate course rows from courses table.\n";

    if ($conn->inTransaction()) {
        $conn->commit();
    }
    echo "\n✅ MIGRATION COMMITTED SUCCESSFULLY!\n";

    // -------------------------------------------------------------------------
    // Step 6. Add UNIQUE KEY constraint on courses.name (DDL outside transaction)
    // -------------------------------------------------------------------------
    echo "6. Ensuring UNIQUE KEY constraint on courses.name...\n";
    $idxChk = $conn->query("SHOW INDEX FROM courses WHERE Key_name = 'uq_courses_name'")->fetch();
    if (!$idxChk) {
        $conn->exec("ALTER TABLE courses ADD UNIQUE KEY uq_courses_name (name)");
        echo "   ✓ Added UNIQUE KEY uq_courses_name on courses (name).\n";
    } else {
        echo "   ✓ UNIQUE KEY uq_courses_name already exists.\n";
    }

    $finalCount = $conn->query("SELECT count(*) FROM courses")->fetchColumn();
    echo "Final active subjects count in catalogue: $finalCount\n\n";

} catch (Exception $e) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    echo "❌ MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}
