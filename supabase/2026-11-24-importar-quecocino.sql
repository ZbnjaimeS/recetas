-- Recetas importadas de Qué cocino (9 recetas, 1 ración cada una).
-- Pegar en Supabase -> SQL Editor -> New query -> Run. No duplica si ya existen.

insert into public.recetas (categoria, titulo, raciones, ingredientes, instrucciones, notas, autor_nombre)
select * from (values
  ('comida', 'Colirroz con pollo', 1,
   array['200 g de coliflor', '50 g de pechuga de pollo', '50 g de champiñones', '30 g de pimiento rojo', '20 g de pimiento verde', '20 g de cebolla', '1 cdta de aceite de oliva', 'Ajo (al gusto)'],
   array['Picar la verdura y saltear.', 'Cuando ya esté casi hecha, añadir el pollo en trocitos y saltear.', 'Condimentar con las especias que se desee.', 'Cuando esté cocinado, añadir la coliflor previamente picada en la picadora o rallada en crudo (queda como el couscous) y dar vueltas durante unos minutos. Servir en caliente.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('comida', 'Crema de calabaza y calabacín', 1,
   array['100 g de calabacín', '50 g de calabaza', '30 g de puerro', '30 g de zanahoria', '20 g de cebolla', '1 cdta de aceite de oliva', '1 diente de ajo'],
   array['Cocer las verduras troceadas en el agua justa para luego triturar, junto con una pizca de aceite, sal y las especias que se desee. Batir.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('comida', 'Wok de verduras con arroz y pollo', 1,
   array['100 g de pechuga de pollo', '100 g de calabacín', '60 g de arroz', '50 g de champiñones', '30 g de pimiento rojo', '30 g de pimiento verde', '30 g de cebolla', '1 cdta de aceite de oliva', 'Salsa de soja (al gusto)'],
   array['Lavar y trocear las verduras; saltearlas en el wok con el aceite y las especias que se desee.', 'Trocear el pollo a tiras y agregarlo.', 'Cocer el arroz y, cuando las verduras y el pollo estén hechos, agregarlo, dar unas vueltas y, si se desea, aliñar con un poco de salsa de soja.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('comida', 'Wok de verduras con pollo y salsa de soja', 1,
   array['150 g de pechuga de pollo', '100 g de calabacín', '80 g de zanahoria', '40 g de cebolla', '30 g de brotes de soja', '20 g de salsa de soja', '2 cdtas de aceite de oliva', '1 diente de ajo'],
   array['Calentar el aceite en el wok/sartén.', 'Echar primero la zanahoria y calabacín, en palitos, y hacer a fuego fuerte removiendo todo el tiempo durante 5 minutos.', 'Echar la cebolla y ajo, hacer 5 minutos más, removiendo igualmente todo el tiempo.', 'Añadir el pollo (salpimentado) en tiras y saltear hasta que se haga.', 'Agregar por último los brotes de soja y seguir haciendo a fuego fuerte durante 5 minutos más junto con la salsa de soja/tamari.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('cena', 'Ensalada California', 1,
   array['70 g de lechuga', '60 g de queso fresco', '60 g de zanahoria', '40 g de fiambre de pavo', '40 g de maíz cocido', '1 cdta de aceite de oliva'],
   array['Lavar y trocear los ingredientes.', 'Mezclar y aliñar con las especias que se desee.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('cena', 'Ensalada caprese con aguacate y salmón', 1,
   array['100 g de aguacate', '100 g de tomate', '60 g de queso fresco', '40 g de salmón ahumado', '1 cdta de aceite de oliva', '1 cdta de vinagre', '1 diente de ajo', 'Albahaca (al gusto)'],
   array['Cortar en rodajas el tomate, aguacate y queso (mozzarella fresca o queso fresco); mezclar.', 'Trocear el salmón ahumado y añadir por encima.', 'En un vaso de batidora poner hojas de albahaca lavadas, el ajo pelado, el aceite de oliva, vinagre y una pizca de sal.', 'Triturar hasta conseguir una salsa homogénea, pero con algunos trocitos de hojas de albahaca que se vean.', 'Aliñar con esta salsa en el momento de servir la ensalada.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('cena', 'Revuelto de calabacín con atún', 1,
   array['200 g de calabacín', '60 g de atún en lata', '1 huevo', '30 g de cebolla', '1 cdta de aceite de oliva'],
   array['Cortar la cebolla en juliana y saltearla en la sartén.', 'Cuando empiece a dorarse, añadir el calabacín en rodajas finas y dejar hacer.', 'Cuando se poche, sazonar y aliñar con las especias que se desee.', 'Escurrir la lata de atún y agregar, dar unas vueltas y posteriormente añadir el huevo batido hasta que cuaje al gusto.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('cena', 'Revuelto de patata y pimiento', 1,
   array['200 g de patata', '150 g de pimiento verde', '1 huevo', '2 cdtas de aceite de oliva'],
   array['Cortar en rodajas los ingredientes y poner en un bol con aceite.', 'Hacer en el microondas durante 7 minutos.', 'Sacar, mezclar y volver a calentar 7 minutos (si fuera necesario, calentar unos minutos más en el microondas). Salpimentar.', 'Batir el huevo, añadir y remover en la sartén hasta que cuaje.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime'),
  ('cena', 'Salteado de pollo con champiñones al curry', 1,
   array['150 g de pechuga de pollo', '100 g de champiñones', '30 g de cebolla', '2 cdtas de aceite de oliva', 'Curry (al gusto)'],
   array['Limpiar y laminar los champiñones.', 'Picar la cebolla y saltearla.', 'Cortar la pechuga en daditos y salpimentar, agregarlos a la cebolla y dorar el conjunto, removiéndolo; sazonar.', 'Añadir los champiñones y remover hasta que se haga.', 'Cuando esté listo, echar el curry (opcional) y remover.'],
   'Cantidades para 1 ración. Receta de los menús de Qué cocino.', 'Jaime')
) as v(categoria, titulo, raciones, ingredientes, instrucciones, notas, autor_nombre)
where not exists (select 1 from public.recetas r where r.titulo = v.titulo);
